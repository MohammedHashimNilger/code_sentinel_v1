import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import { runScan } from "../services/analysisEngine.js";

// GitHub signs every webhook payload with our shared secret (set when we
// created the webhook in connectRepo) and sends the signature in this
// header. Verifying it proves the request actually came from GitHub and
// wasn't forged by someone who guessed our webhook URL - that URL is not
// a secret, so without this check, anyone could POST a fake "push" event
// and trigger scans on arbitrary repos in our system.
const verifySignature = (rawBody, signatureHeader) => {
  if (!signatureHeader) return false;

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signatureHeader);

  // Signatures must be the same length for timingSafeEqual - if they
  // aren't, the signature is already wrong (comparing them would throw).
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  // A plain === comparison leaks timing information: it returns false
  // faster the earlier the strings diverge, which an attacker can use to
  // guess the correct signature one byte at a time. timingSafeEqual
  // always takes the same amount of time regardless of where a mismatch
  // occurs.
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

// @route   POST /api/webhooks/github
// Note: this route is mounted with express.raw() in webhookRoutes.js
// instead of the app-wide express.json(). HMAC verification has to run
// over the exact bytes GitHub sent - if Express parsed the body into a
// JS object first and we re-serialized it to verify, whitespace/key-order
// differences would produce a different signature and every request
// would fail verification.
export const handleGithubWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const rawBody = req.body; // Buffer, thanks to express.raw()

  if (!verifySignature(rawBody, signature)) {
    res.status(401);
    throw new Error("Invalid webhook signature");
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const eventType = req.headers["x-github-event"];

  // GitHub sends a "ping" event immediately after a webhook is created,
  // to let us confirm the endpoint is reachable. Nothing to do but
  // acknowledge it.
  if (eventType === "ping") {
    return res.status(200).json({ success: true, message: "Pong" });
  }

  if (eventType !== "push") {
    // We only subscribed to "push" events when creating the webhook, so
    // this shouldn't normally happen - but if GitHub's config ever sends
    // something else, acknowledge it without erroring instead of
    // treating an event we don't handle as a failure.
    return res.status(200).json({ success: true, message: "Event ignored" });
  }

  // payload.deleted is true when the push was actually a branch deletion
  // (all commits removed), and payload.after is all zeros in that case.
  // There's no new code to scan, so skip it.
  if (payload.deleted || payload.after === "0000000000000000000000000000000000000000") {
    return res.status(200).json({ success: true, message: "Branch deletion ignored" });
  }

  const branch = payload.ref.replace("refs/heads/", "");

  // It's possible for more than one connected Repository to point at the
  // same GitHub repo (e.g. two different users both connected the same
  // public repo), so we scan for all matches rather than assuming one.
  const repositories = await Repository.find({ githubRepoId: String(payload.repository.id) });

  if (repositories.length === 0) {
    // Not necessarily an error on our end - could be a leftover webhook
    // GitHub is still delivering to after a disconnect failed to clean
    // it up. Acknowledge so GitHub doesn't keep retrying.
    return res.status(200).json({ success: true, message: "No matching repository" });
  }

  const scansCreated = [];

  for (const repository of repositories) {
    // Only scan pushes to the repo's default branch - pushes to feature
    // branches would create a lot of noise in the health score history
    // for code that isn't even merged yet.
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

    // Intentionally not awaited: GitHub expects a webhook response within
    // ~10 seconds, but a full scan (download + ESLint + npm audit) can
    // take much longer. runScan handles its own errors internally
    // (updates scan.status to "failed" on failure) so a rejected promise
    // here can't crash the server - it just means we don't need to wait
    // for it before responding to GitHub.
    runScan(scan._id);
  }

  res.status(200).json({ success: true, scansCreated: scansCreated.length });
});
