import express from "express";
import {
  explainIssueController,
  runSemanticReviewController,
} from "../controllers/aiController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/issues/:issueId/explain", explainIssueController);
router.post("/scans/:scanId/semantic-review", runSemanticReviewController);

export default router;
