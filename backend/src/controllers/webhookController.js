import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import { runScan } from "../services/analysisEngine.js";

const verifySignature = (rawBody, signatureHeader) => {
  if (!signatureHeader) return false;

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signatureHeader);

  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

export const handleGithubWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const rawBody = req.body;

  if (!verifySignature(rawBody, signature)) {
    res.status(401);
    throw new Error("Invalid webhook signature");
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const eventType = req.headers["x-github-event"];

  if (eventType === "ping") {
    return res.status(200).json({ success: true, message: "Pong" });
  }

  if (eventType !== "push") {
    return res.status(200).json({ success: true, message: "Event ignored" });
  }

  if (payload.deleted || payload.after === "0000000000000000000000000000000000000000") {
    return res.status(200).json({ success: true, message: "Branch deletion ignored" });
  }

  const branch = payload.ref.replace("refs/heads/", "");

  const repositories = await Repository.find({ githubRepoId: String(payload.repository.id) });

  if (repositories.length === 0) {
    return res.status(200).json({ success: true, message: "No matching repository" });
  }

  const scansCreated = [];

  for (const repository of repositories) {
    if (branch !== repository.defaultBranch) {
      continue;
    }

    const scan = await Scan.create({
      repository: repository._id,
      commitSha: payload.after,
      branch,
      triggeredBy: "push",
      status: "pending",
    });

    repository.lastScanAt = new Date();
    await repository.save();

    scansCreated.push(scan._id);

    runScan(scan._id);
  }

  res.status(200).json({ success: true, scansCreated: scansCreated.length });
});
