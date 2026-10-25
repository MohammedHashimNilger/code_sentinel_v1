import asyncHandler from "../utils/asyncHandler.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";
import Issue from "../models/Issue.js";
import { generateScanReportPdf } from "../services/reportService.js";

export const exportScanReport = asyncHandler(async (req, res) => {
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

  if (scan.status !== "completed") {
    res.status(400);
    throw new Error("Cannot export a report for a scan that hasn't completed");
  }

  const issues = await Issue.find({ scan: scan._id });
  const pdfBuffer = await generateScanReportPdf(scan, repository, issues);

  const fileName = `codesentinel-${repository.name}-${scan.commitSha.slice(0, 7)}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
});
