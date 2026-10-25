import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import Issue from "../models/Issue.js";
import { downloadAndExtractRepo } from "../services/repoFetchService.js";
import { explainIssue, semanticReview } from "../services/groqService.js";
import { calculateHealthScore } from "../services/healthScoreService.js";

const VALID_CATEGORIES = ["security", "correctness", "maintainability"];
const VALID_SEVERITIES = ["critical", "high", "medium", "low"];

export const explainIssueController = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.issueId);

  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const repository = await Repository.findOne({
    _id: issue.repository,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Issue not found");
  }

  if (issue.aiExplanation && issue.aiSuggestedFix) {
    return res.status(200).json({ success: true, issue, cached: true });
  }

  const { explanation, suggestedFix } = await explainIssue(issue);

  issue.aiExplanation = explanation;
  issue.aiSuggestedFix = suggestedFix;
  await issue.save();

  res.status(200).json({ success: true, issue, cached: false });
});

const MAX_FILES = 15;
const MAX_FILE_SIZE_BYTES = 30 * 1024;
const SKIPPED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "vendor",
  ".git",
]);

const collectReviewCandidates = async (dirPath, candidates = []) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) {
        await collectReviewCandidates(fullPath, candidates);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".js") || entry.name.endsWith(".jsx"))
    ) {
      const stats = await fs.stat(fullPath);
      if (stats.size <= MAX_FILE_SIZE_BYTES) {
        candidates.push({ fullPath, size: stats.size });
      }
    }
  }

  return candidates;
};

const selectFilesForReview = async (repoPath) => {
  const candidates = await collectReviewCandidates(repoPath);

  candidates.sort((a, b) => a.size - b.size);

  const selected = candidates.slice(0, MAX_FILES);

  return Promise.all(
    selected.map(async (candidate) => ({
      filePath: path.relative(repoPath, candidate.fullPath),
      content: await fs.readFile(candidate.fullPath, "utf8"),
    })),
  );
};

const clampToEnum = (value, validValues, fallback) =>
  validValues.includes(value) ? value : fallback;

export const runSemanticReviewController = asyncHandler(async (req, res) => {
  const scan = await Scan.findById(req.params.scanId);

  if (!scan) {
    res.status(404);
    throw new Error("Scan not found");
  }

  const repository = await Repository.findOne({
    _id: scan.repository,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Scan not found");
  }

  const workDir = path.join(os.tmpdir(), `codesentinel-ai-review-${scan._id}`);

  try {
    await fs.mkdir(workDir, { recursive: true });

    const owner = await User.findById(repository.owner).select(
      "+encryptedAccessToken",
    );
    const accessToken = owner.getAccessToken();

    const repoPath = await downloadAndExtractRepo(
      repository.fullName,
      scan.commitSha,
      accessToken,
      workDir,
    );

    const files = await selectFilesForReview(repoPath);

    if (files.length === 0) {
      return res.status(200).json({
        success: true,
        findingsCreated: 0,
        message: "No JS/JSX files to review",
      });
    }

    const findings = await semanticReview(files);

    const issueDocuments = findings.map((finding) => ({
      scan: scan._id,
      repository: repository._id,
      category: clampToEnum(finding.category, VALID_CATEGORIES, "correctness"),
      severity: clampToEnum(finding.severity, VALID_SEVERITIES, "medium"),
      source: "ai-semantic",
      ruleId: "ai-semantic-review",
      message: finding.message || "AI-identified issue",
      filePath: finding.filePath || "unknown",
      lineNumber:
        typeof finding.lineNumber === "number" ? finding.lineNumber : null,
    }));

    if (issueDocuments.length > 0) {
      await Issue.insertMany(issueDocuments);
    }

    const allIssuesForScan = await Issue.find({ scan: scan._id });
    scan.severityBreakdown = {
      critical: allIssuesForScan.filter((i) => i.severity === "critical")
        .length,
      high: allIssuesForScan.filter((i) => i.severity === "high").length,
      medium: allIssuesForScan.filter((i) => i.severity === "medium").length,
      low: allIssuesForScan.filter((i) => i.severity === "low").length,
    };
    scan.healthScore = calculateHealthScore(allIssuesForScan);
    await scan.save();

    res.status(200).json({
      success: true,
      findingsCreated: issueDocuments.length,
      updatedHealthScore: scan.healthScore,
    });
  } finally {
    if (fsSync.existsSync(workDir)) {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }
});
