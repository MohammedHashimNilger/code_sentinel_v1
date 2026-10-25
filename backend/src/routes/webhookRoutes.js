import express from "express";
import { handleGithubWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// express.raw() keeps req.body as an untouched Buffer instead of parsing
// it into an object. This route needs the exact raw bytes to verify
// GitHub's HMAC signature - see the comment in webhookController.js.
router.post("/github", express.raw({ type: "application/json" }), handleGithubWebhook);

export default router;
