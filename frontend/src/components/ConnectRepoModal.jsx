import { useEffect, useState } from "react";
import { IconLock } from "@tabler/icons-react";
import api from "../api/axios.js";
import Modal from "./Modal.jsx";
import { getErrorMessage } from "../utils/score.js";

const ConnectRepoModal = ({ onClose, onConnected }) => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [connectingId, setConnectingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRepos = async () => {
      try {
        const response = await api.get("/api/repos/available");
        setRepos(response.data.repos);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    loadRepos();
  }, []);

  const handleConnect = async (githubRepoId) => {
    setConnectingId(githubRepoId);
    setError("");
    try {
      await api.post("/api/repos/connect", { githubRepoId });
      onConnected();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setConnectingId(null);
    }
  };

  const filteredRepos = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title="Connect a repository" onClose={onClose}>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Filter your repositories"
        className="w-full bg-ink border border-line rounded-md px-3 py-2 text-parchment text-sm mb-4 focus:outline-none focus:border-sentinel"
      />

      {error && <p className="text-critical text-sm mb-4">{error}</p>}

      {loading && <p className="text-muted text-sm">Loading your repositories...</p>}

      {!loading && filteredRepos.length === 0 && (
        <p className="text-muted text-sm">
          {repos.length === 0
            ? "Every repository you can access is already connected."
            : "No repositories match that filter."}
        </p>
      )}

      <ul className="divide-y divide-line">
        {filteredRepos.map((repo) => (
          <li key={repo.githubRepoId} className="flex items-center justify-between py-3 gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-parchment truncate">{repo.fullName}</span>
                {repo.isPrivate && <IconLock size={14} className="text-muted shrink-0" />}
              </div>
            </div>
            <button
              onClick={() => handleConnect(repo.githubRepoId)}
              disabled={connectingId !== null}
              className="shrink-0 text-sm bg-sentinel text-ink font-medium px-3 py-1.5 rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {connectingId === repo.githubRepoId ? "Connecting..." : "Connect"}
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
};

export default ConnectRepoModal;
