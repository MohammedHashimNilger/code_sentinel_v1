import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    scan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    category: {
      type: String,
      enum: ["security", "correctness", "maintainability"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: true,
    },
    source: {
      type: String,
      enum: ["eslint", "complexity", "npm-audit", "osv", "ai-semantic"],
      required: true,
    },
    ruleId: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    lineNumber: {
      type: Number,
    },
    codeSnippet: {
      type: String,
    },
    complexityScore: {
      type: Number,
    },
    packageName: {
      type: String,
    },
    vulnerableVersion: {
      type: String,
    },
    patchedVersion: {
      type: String,
    },
    aiExplanation: {
      type: String,
    },
    aiSuggestedFix: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

issueSchema.index({ scan: 1, severity: 1 });
issueSchema.index({ repository: 1 });

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
