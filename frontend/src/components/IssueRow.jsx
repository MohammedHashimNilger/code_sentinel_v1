import { useState } from "react";
import { IconChevronDown, IconSparkles } from "@tabler/icons-react";
import api from "../api/axios.js";
import { getErrorMessage } from "../utils/score.js";

const SEVERITY_DOT = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-line",
};

const SOURCE_LABEL = {
  eslint: "ESLint",
  complexity: "Complexity",
  "npm-audit": "npm audit",
  osv: "OSV.dev",
  "ai-semantic": "AI review",
};

const IssueRow = ({ issue }) => {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState(issue.aiExplanation || null);
  const [suggestedFix, setSuggestedFix] = useState(issue.aiSuggestedFix || null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [error, setError] = useState("");

  const handleExplain = async () => {
    setLoadingExplanation(true);
    setError("");
    try {
      const response = await api.post(`/api/ai/issues/${issue._id}/explain`);
      setExplanation(response.data.issue.aiExplanation);
      setSuggestedFix(response.data.issue.aiSuggestedFix);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity]}`} />

        <div className="min-w-0 flex-1">
          <p className="text-parchment text-sm truncate">{issue.message}</p>
          <p className="text-muted text-xs font-mono mt-0.5">
            {issue.filePath}
            {issue.lineNumber ? `:${issue.lineNumber}` : ""}
            <span className="mx-2">·</span>
            {SOURCE_LABEL[issue.source] || issue.source}
          </p>
        </div>

        <IconChevronDown
          size={16}
          className={`text-muted shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-line pt-3">
          {issue.codeSnippet && (
            <pre className="bg-ink rounded-md p-3 text-xs font-mono text-parchment overflow-x-auto mb-3">
              {issue.codeSnippet}
            </pre>
          )}

          {!explanation && (
            <button
              onClick={handleExplain}
              disabled={loadingExplanation}
              className="inline-flex items-center gap-1.5 text-sm text-sentinel hover:opacity-80 disabled:opacity-50"
            >
              <IconSparkles size={16} stroke={1.75} />
              {loadingExplanation ? "Thinking..." : "Explain with AI"}
            </button>
          )}

          {error && <p className="text-critical text-sm mt-2">{error}</p>}

          {explanation && (
            <div className="space-y-3">
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Why it matters</p>
                <p className="text-parchment text-sm leading-relaxed">{explanation}</p>
              </div>
              <div>
                <p className="text-muted text-xs uppercase tracking-wide mb-1">Suggested fix</p>
                <p className="text-parchment text-sm leading-relaxed whitespace-pre-wrap">
                  {suggestedFix}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IssueRow;
