import express from "express";
import { exportScanReport } from "../controllers/reportController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/scans/:scanId", exportScanReport);

export default router;
