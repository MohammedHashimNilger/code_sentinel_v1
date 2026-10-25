import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import path from "path";
import Scan from "../models/Scan.js";
import Repository from "../models/Repository.js";
import User from "../models/User.js";
import Issue from "../models/Issue.js";
import { downloadAndExtractRepo } from "./repoFetchService.js";
import { lintDirectory } from "./eslintService.js";
import { scanDependencies } from "./vulnerabilityService.js";
import { calculateHealthScore } from "./healthScoreService.js";

const countBySeverity = (issues) => {
  const breakdown = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    breakdown[issue.severity] += 1;
  }
  return breakdown;
};

export const runScan = async (scanId) => {
  const scan = await Scan.findById(scanId);
  if (!scan) {
    console.error(`runScan called with unknown scan ID: ${scanId}`);
    return;
  }

  const repository = await Repository.findById(scan.repository);
  if (!repository) {
    scan.status = "failed";
    scan.errorMessage = "Repository no longer exists";
    await scan.save();
    return;
  }

  scan.status = "running";
  scan.startedAt = new Date();
  await scan.save();

  const workDir = path.join(os.tmpdir(), `codesentinel-scan-${scan._id}`);

  try {
    await fs.mkdir(workDir, { recursive: true });

    const owner = await User.findById(repository.owner).select("+encryptedAccessToken");
    const accessToken = owner.getAccessToken();

    const repoPath = await downloadAndExtractRepo(
      repository.fullName,
      scan.commitSha,
      accessToken,
      workDir
    );

    const [lintIssues, vulnIssues] = await Promise.all([
      lintDirectory(repoPath),
      scanDependencies(repoPath),
    ]);

    const allIssues = [...lintIssues, ...vulnIssues];

    const issueDocuments = allIssues.map((issue) => ({
      ...issue,
      scan: scan._id,
      repository: repository._id,
    }));

    if (issueDocuments.length > 0) {
      await Issue.insertMany(issueDocuments);
    }

    scan.status = "completed";
    scan.completedAt = new Date();
    scan.severityBreakdown = countBySeverity(allIssues);
    scan.healthScore = calculateHealthScore(allIssues);
    await scan.save();
  } catch (error) {
    console.error(`Scan ${scan._id} failed: ${error.message}`);
    scan.status = "failed";
    scan.errorMessage = error.message;
    scan.completedAt = new Date();
    await scan.save();
  } finally {
    if (fsSync.existsSync(workDir)) {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  }
};
