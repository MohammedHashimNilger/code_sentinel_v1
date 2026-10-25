import express from "express";
import {
  getAvailableRepos,
  getConnectedRepos,
  connectRepo,
  disconnectRepo,
} from "../controllers/repoController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/available", getAvailableRepos);
router.get("/", getConnectedRepos);
router.post("/connect", connectRepo);
router.delete("/:id", disconnectRepo);

export default router;
