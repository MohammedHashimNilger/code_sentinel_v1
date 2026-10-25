import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { IconArrowLeft, IconRefresh, IconSparkles, IconExternalLink, IconFileDownload } from "@tabler/icons-react";
import api from "../api/axios.js";
import AppHeader from "../components/AppHeader.jsx";
import HealthGauge from "../components/HealthGauge.jsx";
import SeverityBreakdown from "../components/SeverityBreakdown.jsx";
import TrendChart from "../components/TrendChart.jsx";
import IssueRow from "../components/IssueRow.jsx";
import { getErrorMessage, formatDate } from "../utils/score.js";

const STATUS_LABEL = {
  pending: "Queued",
  running: "Scanning...",
  completed: "Completed",
  failed: "Failed",
};

const RepoDetail = () => {
  const { id } = useParams();

  const [repo, setRepo] = useState(null);
  const [scans, setScans] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [runningReview, setRunningReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  // The repo itself has no single-GET endpoint of its own - it's always
  // listed as part of the connected-repos list, so we pull it from there
  // and match by ID rather than adding a redundant endpoint just for
  // this page.
  const loadRepo = useCallback(async () => {
    const response = await api.get("/api/repos");
    const match = response.data.repos.find((r) => r._id === id);
    setRepo(match || null);
  }, [id]);

  const loadScans = useCallback(async () => {
    const response = await api.get(`/api/repos/${id}/scans`);
    setScans(response.data.scans);
    return response.data.scans;
  }, [id]);

  const loadIssues = useCallback(async (scanId) => {
    if (!scanId) {
      setIssues([]);
      return;
    }
    const response = await api.get(`/api/scans/${scanId}/issues`);
    setIssues(response.data.issues);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [, scanList] = await Promise.all([loadRepo(), loadScans()]);
      await loadIssues(scanList[0]?._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loadRepo, loadScans, loadIssues]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const latestScan = scans[0];

  const handleManualScan = async () => {
    setTriggeringScan(true);
    setError("");
    try {
      await api.post(`/api/repos/${id}/scans`);
      // The scan runs in the background (fire-and-forget on the
      // backend), so immediately refreshing just shows it as "pending" -
      // the user can refresh again once it completes. A full polling
      // loop would be a nice upgrade but isn't essential for v1.
      await loadScans();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTriggeringScan(false);
    }
  };

  const handleSemanticReview = async () => {
    if (!latestScan) return;
    setRunningReview(true);
    setReviewMessage("");
    setError("");
    try {
      const response = await api.post(`/api/ai/scans/${latestScan._id}/semantic-review`);
      setReviewMessage(
        `AI review found ${response.data.findingsCreated} additional issue${response.data.findingsCreated === 1 ? "" : "s"}.`
      );
      await loadScans();
      await loadIssues(latestScan._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRunningReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="text-muted text-sm px-8 py-10">Loading...</p>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="px-8 py-10">
          <p className="text-parchment">Repository not found.</p>
          <Link to="/dashboard" className="text-sentinel text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-6 md:px-8 py-10">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-muted hover:text-parchment text-sm mb-6">
          <IconArrowLeft size={16} stroke={1.75} />
          Back
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-mono text-xl text-parchment mb-1">{repo.fullName}</h1>
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-muted hover:text-parchment text-sm"
            >
              View on GitHub
              <IconExternalLink size={14} stroke={1.75} />
            </a>
          </div>

          <button
            onClick={handleManualScan}
            disabled={triggeringScan}
            className="inline-flex items-center gap-2 bg-surface border border-line text-parchment text-sm font-medium px-4 py-2 rounded-md hover:border-sentinel disabled:opacity-50"
          >
            <IconRefresh size={16} stroke={1.75} className={triggeringScan ? "animate-spin" : ""} />
            {triggeringScan ? "Starting scan..." : "Scan now"}
          </button>
        </div>

        {error && <p className="text-critical text-sm mb-6">{error}</p>}

        {!latestScan && (
          <p className="text-muted text-sm">No scans yet - push to the repo or click "Scan now".</p>
        )}

        {latestScan && (
          <>
            <div className="grid md:grid-cols-[auto_1fr] gap-8 items-start bg-surface border border-line rounded-lg p-6 mb-8">
              <HealthGauge score={latestScan.healthScore} />

              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="text-muted text-sm">
                    {STATUS_LABEL[latestScan.status]} · {formatDate(latestScan.createdAt)}
                  </span>
                  {latestScan.status === "completed" && (
                    <a
                      href={`${import.meta.env.VITE_API_URL}/api/reports/scans/${latestScan._id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-parchment"
                    >
                      <IconFileDownload size={16} stroke={1.75} />
                      Export PDF
                    </a>
                  )}
                </div>
                <SeverityBreakdown breakdown={latestScan.severityBreakdown} />
              </div>
            </div>

            <div className="bg-surface border border-line rounded-lg p-6 mb-8">
              <h2 className="text-parchment font-semibold mb-4">Health score trend</h2>
              <TrendChart scans={scans} />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-parchment font-semibold">
                Issues <span className="text-muted font-normal">({issues.length})</span>
              </h2>
              <button
                onClick={handleSemanticReview}
                disabled={runningReview || latestScan.status !== "completed"}
                className="inline-flex items-center gap-1.5 text-sm text-sentinel hover:opacity-80 disabled:opacity-40"
              >
                <IconSparkles size={16} stroke={1.75} />
                {runningReview ? "Reviewing..." : "Run AI semantic review"}
              </button>
            </div>

            {reviewMessage && <p className="text-healthy text-sm mb-4">{reviewMessage}</p>}

            {issues.length === 0 ? (
              <p className="text-muted text-sm">No issues found in this scan.</p>
            ) : (
              <div className="space-y-2">
                {issues.map((issue) => (
                  <IssueRow key={issue._id} issue={issue} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default RepoDetail;
