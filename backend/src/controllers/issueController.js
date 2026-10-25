import asyncHandler from "../utils/asyncHandler.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import Issue from "../models/Issue.js";

// @route   GET /api/scans/:scanId/issues
// Optional query params: ?severity=high&category=security to let the
// dashboard filter without pulling every issue and filtering client-side.
export const getIssuesForScan = asyncHandler(async (req, res) => {
  const scan = await Scan.findById(req.params.scanId);

  if (!scan) {
    res.status(404);
    throw new Error("Scan not found");
  }

  const repository = await Repository.findOne({
    _id: scan.repository,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Scan not found");
  }

  const query = { scan: scan._id };
  if (req.query.severity) query.severity = req.query.severity;
  if (req.query.category) query.category = req.query.category;

  // Worst-first ordering: critical/security issues are what a developer
  // should see and act on first when opening a scan's results.
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const issues = await Issue.find(query);
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  res.status(200).json({ success: true, issues });
});

// @route   GET /api/issues/:id
export const getIssueById = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);

  if (!issue) {
    res.status(404);
    throw new Error("Issue not found");
  }

  const repository = await Repository.findOne({
    _id: issue.repository,
    owner: req.user._id,
  });

  if (!repository) {
    res.status(404);
    throw new Error("Issue not found");
  }

  res.status(200).json({ success: true, issue });
});
