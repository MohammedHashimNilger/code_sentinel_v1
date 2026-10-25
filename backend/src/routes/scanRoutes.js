import express from "express";
import { getScansForRepo, triggerManualScan, getScanById } from "../controllers/scanController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/repos/:repoId/scans", getScansForRepo);
router.post("/repos/:repoId/scans", triggerManualScan);
router.get("/scans/:id", getScanById);

export default router;
