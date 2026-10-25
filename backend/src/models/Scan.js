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
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    severityBreakdown: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
    },
    errorMessage: {
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

scanSchema.index({ repository: 1, createdAt: -1 });

const Scan = mongoose.model("Scan", scanSchema);

export default Scan;
