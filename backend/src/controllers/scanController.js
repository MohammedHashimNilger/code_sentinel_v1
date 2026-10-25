import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import { getLatestCommitSha } from "../services/githubService.js";
import { runScan } from "../services/analysisEngine.js";

// How many scans the trend chart needs - recent history is what's useful
// for a health-score-over-time chart, not the repo's entire scan history
// since the start of the project.
const SCAN_HISTORY_LIMIT = 30;

// @route   GET /api/repos/:repoId/scans
export const getScansForRepo = asyncHandler(async (req, res) => {
  const repository = await Repository.findOne({
    _id: req.params.repoId,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Repository not found");
  }

  const scans = await Scan.find({ repository: repository._id })
    .sort("-createdAt")
    .limit(SCAN_HISTORY_LIMIT);

  res.status(200).json({ success: true, scans });
});

// @route   POST /api/repos/:repoId/scans
// Manually triggers a scan against the current tip of the repo's default
// branch, rather than waiting for the next push.
export const triggerManualScan = asyncHandler(async (req, res) => {
  const repository = await Repository.findOne({
    _id: req.params.repoId,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Repository not found");
  }

  const owner = await User.findById(repository.owner).select("+encryptedAccessToken");
  const accessToken = owner.getAccessToken();

  const commitSha = await getLatestCommitSha(accessToken, repository.fullName, repository.defaultBranch);

  const scan = await Scan.create({
    repository: repository._id,
    commitSha,
    branch: repository.defaultBranch,
    triggeredBy: "manual",
    status: "pending",
  });

  // Same fire-and-forget pattern as the webhook flow - the HTTP response
  // shouldn't wait for a full scan to finish, and runScan handles its
  // own error state internally.
  runScan(scan._id);

  res.status(201).json({ success: true, scan });
});

// @route   GET /api/scans/:id
export const getScanById = asyncHandler(async (req, res) => {
  const scan = await Scan.findById(req.params.id);

  if (!scan) {
    res.status(404);
    throw new Error("Scan not found");
  }

  // A scan has no owner field of its own - ownership flows through its
  // repository, the same pattern used for issues in aiController.
  const repository = await Repository.findOne({
    _id: scan.repository,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Scan not found");
  }

  res.status(200).json({ success: true, scan });
});
