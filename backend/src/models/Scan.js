import mongoose from "mongoose";

const scanSchema = new mongoose.Schema(
  {
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    commitSha: {
      type: String,
      required: true,
    },
    branch: {
      type: String,
      required: true,
    },
    triggeredBy: {
      // "push" = came from a GitHub webhook, "manual" = user clicked
      // "scan now" in the dashboard.
      type: String,
      enum: ["push", "manual"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
    },
    healthScore: {
      // 0-100, calculated by healthScoreService once the scan completes.
      // Null while the scan is still pending/running.
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    // Issue counts broken down by severity, stored directly on the scan
    // so the dashboard's trend chart can be built with one query instead
    // of aggregating the Issue collection every time it's rendered.
    severityBreakdown: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    errorMessage: {
      // Populated if status is "failed" - e.g. clone failed, ESLint
      // crashed on malformed config, etc.
      type: String,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Scans are almost always queried "give me the last N scans for repo X,
// newest first" - this compound index matches that access pattern exactly.
scanSchema.index({ repository: 1, createdAt: -1 });

const Scan = mongoose.model("Scan", scanSchema);

export default Scan;
