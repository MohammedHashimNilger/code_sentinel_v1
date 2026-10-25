import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import { getLatestCommitSha } from "../services/githubService.js";
import { runScan } from "../services/analysisEngine.js";

const SCAN_HISTORY_LIMIT = 30;

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

  runScan(scan._id);

  res.status(201).json({ success: true, scan });
});

export const getScanById = asyncHandler(async (req, res) => {
  const scan = await Scan.findById(req.params.id);

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

  res.status(200).json({ success: true, scan });
});
