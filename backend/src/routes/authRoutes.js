import express from "express";
import { githubLogin, githubCallback, logout, getMe } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;
