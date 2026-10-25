import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// A basic health check endpoint. Useful for confirming the server is up
// during local dev, and later for Render's health check config.
router.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  // Mongoose connection states: 0 = disconnected, 1 = connected,
  // 2 = connecting, 3 = disconnecting
  const dbStatus = ["disconnected", "connected", "connecting", "disconnecting"][dbState];

  res.status(200).json({
    status: "ok",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

export default router;
