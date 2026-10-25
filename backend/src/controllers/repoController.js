import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/User.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import Issue from "../models/Issue.js";
import {
  listUserRepos,
  fetchRepoById,
  createWebhook,
  deleteWebhook,
} from "../services/githubService.js";

const getAccessTokenForUser = async (userId) => {
  const user = await User.findById(userId).select("+encryptedAccessToken");
  return user.getAccessToken();
};

export const getAvailableRepos = asyncHandler(async (req, res) => {
  const accessToken = await getAccessTokenForUser(req.user._id);
  const githubRepos = await listUserRepos(accessToken);

  const connectedRepos = await Repository.find({ owner: req.user._id }).select("githubRepoId");
  const connectedIds = new Set(connectedRepos.map((r) => r.githubRepoId));

  const availableRepos = githubRepos
    .filter((repo) => !connectedIds.has(String(repo.id)))
    .map((repo) => ({
      githubRepoId: String(repo.id),
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
    }));

  res.status(200).json({ success: true, repos: availableRepos });
});

export const getConnectedRepos = asyncHandler(async (req, res) => {
  const repos = await Repository.find({ owner: req.user._id }).sort("-createdAt");
  res.status(200).json({ success: true, repos });
});

export const connectRepo = asyncHandler(async (req, res) => {
  const { githubRepoId } = req.body;

  if (!githubRepoId) {
    res.status(400);
    throw new Error("githubRepoId is required");
  }

  const alreadyConnected = await Repository.findOne({
    owner: req.user._id,
    githubRepoId: String(githubRepoId),
  });

  if (alreadyConnected) {
    res.status(400);
    throw new Error("This repository is already connected");
  }

  const accessToken = await getAccessTokenForUser(req.user._id);

  const githubRepo = await fetchRepoById(accessToken, githubRepoId);

  const webhookUrl = `${process.env.BACKEND_URL}/api/webhooks/github`;
  const webhookId = await createWebhook(accessToken, githubRepo.full_name, webhookUrl);

  const repository = await Repository.create({
    owner: req.user._id,
    githubRepoId: String(githubRepo.id),
    name: githubRepo.name,
    fullName: githubRepo.full_name,
    htmlUrl: githubRepo.html_url,
    defaultBranch: githubRepo.default_branch,
    isPrivate: githubRepo.private,
    webhookId: String(webhookId),
  });

  res.status(201).json({ success: true, repository });
});

export const disconnectRepo = asyncHandler(async (req, res) => {
  const { confirmFullName } = req.body;

  const repository = await Repository.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Repository not found");
  }

  if (confirmFullName !== repository.fullName) {
    res.status(400);
    throw new Error("Confirmation text does not match the repository name");
  }

  const accessToken = await getAccessTokenForUser(req.user._id);

  try {
    await deleteWebhook(accessToken, repository.fullName, repository.webhookId);
  } catch (error) {
    console.warn(`Could not delete GitHub webhook for ${repository.fullName}: ${error.message}`);
  }

  await Issue.deleteMany({ repository: repository._id });
  await Scan.deleteMany({ repository: repository._id });
  await Repository.deleteOne({ _id: repository._id });

  res.status(200).json({ success: true, message: "Repository disconnected" });
});
