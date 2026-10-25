import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    scan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
    },
    // Denormalized from scan.repository. Without this, deleting all
    // issues for a repository (Disconnect flow) would require first
    // finding every scan for that repo, then finding every issue for
    // each of those scans. Storing it directly turns that into one
    // query: Issue.deleteMany({ repository: repoId }).
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    // category drives the severity-tiered health score weighting:
    // security issues cost the most, correctness bugs less, and
    // maintainability nits the least - regardless of how "severe" a
    // single finding looks in isolation.
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
    // Where this finding came from - lets the UI show a source badge
    // and lets us debug which detector produced a false positive.
    source: {
      type: String,
      enum: ["eslint", "complexity", "npm-audit", "osv", "ai-semantic"],
      required: true,
    },
    ruleId: {
      // e.g. "no-unused-vars" for ESLint, "CVE-2023-xxxx" for a
      // vulnerability, "high-complexity" for our own complexity check.
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
      // Not required - dependency vulnerabilities (npm-audit/osv) point
      // at a package, not a specific line in the codebase.
      type: Number,
    },
    codeSnippet: {
      type: String,
    },
    // Only populated for "complexity" source issues - the actual
    // cyclomatic complexity score of the flagged function, so the UI
    // can show "complexity: 14" instead of just a generic message.
    complexityScore: {
      type: Number,
    },
    // Only populated for "npm-audit"/"osv" source issues.
    packageName: {
      type: String,
    },
    vulnerableVersion: {
      type: String,
    },
    patchedVersion: {
      type: String,
    },
    // Filled in on demand when the user clicks "Explain" or "Suggest fix"
    // in the dashboard (Phase 8), so we don't burn AI API calls on every
    // issue in every scan - only the ones a user actually looks at.
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

// The dashboard's issue list is filtered/sorted by scan and severity
// constantly - this compound index covers that query directly.
issueSchema.index({ scan: 1, severity: 1 });
issueSchema.index({ repository: 1 });

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;
