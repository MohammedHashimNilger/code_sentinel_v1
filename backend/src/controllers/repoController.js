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

// req.user comes from authMiddleware without the access token (select:
// false). Every function here needs the raw GitHub token to call GitHub's
// API on the user's behalf, so this re-fetches the user with it included.
const getAccessTokenForUser = async (userId) => {
  const user = await User.findById(userId).select("+encryptedAccessToken");
  return user.getAccessToken();
};

// @route   GET /api/repos/available
// Returns the user's GitHub repos that are NOT already connected, so the
// frontend can show a "connect" list without duplicates.
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

// @route   GET /api/repos
// Returns the repos this user has already connected.
export const getConnectedRepos = asyncHandler(async (req, res) => {
  const repos = await Repository.find({ owner: req.user._id }).sort("-createdAt");
  res.status(200).json({ success: true, repos });
});

// @route   POST /api/repos/connect
// body: { githubRepoId }
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

  // Re-fetch the repo from GitHub using only the ID the client sent.
  // This confirms the user actually has access to it (GitHub 404s
  // otherwise) and gives us trustworthy metadata instead of whatever
  // the client claims the repo's name/URL are.
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

// @route   DELETE /api/repos/:id
// body: { confirmFullName }
// Disconnecting is destructive - it permanently deletes scan/issue
// history - so beyond the ownership check, we require the client to send
// back the repo's exact fullName as an explicit confirmation, the same
// pattern GitHub itself uses for destructive actions like deleting a repo.
export const disconnectRepo = asyncHandler(async (req, res) => {
  const { confirmFullName } = req.body;

  // Scoping the query to owner: req.user._id means a user can never even
  // discover whether a repo ID belongs to someone else - it simply won't
  // match, and they get the same 404 as a nonexistent ID.
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
    // The webhook may have already been removed manually on GitHub's
    // side (e.g. the user deleted it themselves, or deleted the repo
    // entirely). That shouldn't block cleaning up our own records - we
    // log it and continue rather than leaving orphaned data in our DB
    // just because GitHub's side was already gone.
    console.warn(`Could not delete GitHub webhook for ${repository.fullName}: ${error.message}`);
  }

  // Order matters here: delete the "leaf" data (issues) before the data
  // that references it (scans), then the repository itself last.
  await Issue.deleteMany({ repository: repository._id });
  await Scan.deleteMany({ repository: repository._id });
  await Repository.deleteOne({ _id: repository._id });

  res.status(200).json({ success: true, message: "Repository disconnected" });
});
