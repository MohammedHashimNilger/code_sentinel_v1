import PDFDocument from "pdfkit";

// Matches the severity colors used in the frontend design tokens
// (tailwind.config.js) - the same severity should look the same color
// whether a developer is looking at the dashboard or a PDF they
// downloaded from it.
const SEVERITY_COLOR = {
  critical: "#E5484D",
  high: "#F0883E",
  medium: "#E8C547",
  low: "#6B7280",
};

const scoreColor = (score) => {
  if (score === null || score === undefined) return "#6B7280";
  if (score >= 80) return "#3FB97F";
  if (score >= 50) return "#E8C547";
  return "#E5484D";
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

// Groups issues by severity and returns them in worst-first order, so
// the report reads the same way the dashboard's issue list does -
// critical issues first, low-severity nits last.
const groupBySeverity = (issues) => {
  const groups = { critical: [], high: [], medium: [], low: [] };
  for (const issue of issues) {
    groups[issue.severity]?.push(issue);
  }
  return groups;
};

// Generates a PDF scan report and resolves with the complete file as a
// Buffer. We buffer the whole thing in memory rather than streaming
// directly to the HTTP response - scan reports are small (text only, no
// images), so this keeps reportController simple (send one buffer,
// correct Content-Length) at a cost that's negligible for this use case.
export const generateScanReportPdf = (scan, repository, issues) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // --- Header ---
    doc
      .fontSize(20)
      .fillColor("#12151B")
      .text("CodeSentinel Scan Report", { align: "left" });

    doc
      .fontSize(11)
      .fillColor("#6B7280")
      .text(repository.fullName, { align: "left" })
      .moveDown(0.3);

    doc
      .fontSize(9)
      .fillColor("#6B7280")
      .text(
        `Commit ${scan.commitSha.slice(0, 7)} on ${scan.branch}  ·  Scanned ${scan.completedAt ? scan.completedAt.toLocaleString() : "in progress"}`
      )
      .moveDown(1.5);

    // --- Health score ---
    doc
      .fontSize(12)
      .fillColor("#12151B")
      .text("Health Score", { continued: false })
      .moveDown(0.2);

    doc
      .fontSize(36)
      .fillColor(scoreColor(scan.healthScore))
      .text(scan.healthScore !== null && scan.healthScore !== undefined ? `${scan.healthScore} / 100` : "Pending")
      .moveDown(1);

    // --- Severity breakdown ---
    doc.fontSize(12).fillColor("#12151B").text("Severity Breakdown").moveDown(0.3);

    const breakdown = scan.severityBreakdown || { critical: 0, high: 0, medium: 0, low: 0 };
    for (const severity of SEVERITY_ORDER) {
      doc
        .fontSize(10)
        .fillColor(SEVERITY_COLOR[severity])
        .text(`${severity[0].toUpperCase()}${severity.slice(1)}: `, { continued: true })
        .fillColor("#12151B")
        .text(`${breakdown[severity]}`);
    }
    doc.moveDown(1.5);

    // --- Issues, grouped by severity ---
    doc.fontSize(12).fillColor("#12151B").text(`Issues (${issues.length})`).moveDown(0.5);

    if (issues.length === 0) {
      doc.fontSize(10).fillColor("#6B7280").text("No issues found in this scan.");
    }

    const grouped = groupBySeverity(issues);

    for (const severity of SEVERITY_ORDER) {
      const group = grouped[severity];
      if (group.length === 0) continue;

      doc
        .fontSize(11)
        .fillColor(SEVERITY_COLOR[severity])
        .text(`${severity[0].toUpperCase()}${severity.slice(1)} (${group.length})`)
        .moveDown(0.3);

      for (const issue of group) {
        // doc.text() automatically starts a new page when content would
        // overflow the bottom margin - no manual pagination needed here.
        doc
          .fontSize(10)
          .fillColor("#12151B")
          .text(issue.message, { width: 495 });

        doc
          .fontSize(8)
          .fillColor("#6B7280")
          .text(
            `${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ""}  ·  ${issue.ruleId}`
          )
          .moveDown(0.5);
      }

      doc.moveDown(0.5);
    }

    doc.end();
  });
};
