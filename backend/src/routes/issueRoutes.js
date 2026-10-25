import express from "express";
import { getIssuesForScan, getIssueById } from "../controllers/issueController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/scans/:scanId/issues", getIssuesForScan);
router.get("/issues/:id", getIssueById);

export default router;
