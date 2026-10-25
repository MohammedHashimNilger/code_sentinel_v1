import { useEffect, useState } from "react";
import { IconPlus, IconFolderOff, IconTrash } from "@tabler/icons-react";
import api from "../api/axios.js";
import AppHeader from "../components/AppHeader.jsx";
import RepoCard from "../components/RepoCard.jsx";
import ConnectRepoModal from "../components/ConnectRepoModal.jsx";
import DisconnectModal from "../components/DisconnectModal.jsx";
import { getErrorMessage } from "../utils/score.js";

const Dashboard = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [disconnectTarget, setDisconnectTarget] = useState(null);

  const loadRepos = async () => {
    try {
      const response = await api.get("/api/repos");
      setRepos(response.data.repos);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="px-6 md:px-8 py-10 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-parchment">Repositories</h1>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 bg-sentinel text-ink font-medium text-sm px-4 py-2 rounded-md hover:opacity-90"
          >
            <IconPlus size={18} stroke={2} />
            Connect repository
          </button>
        </div>

        {error && <p className="text-critical text-sm mb-6">{error}</p>}

        {loading && <p className="text-muted text-sm">Loading...</p>}

        {!loading && repos.length === 0 && (
          <div className="flex flex-col items-center text-center py-20 border border-dashed border-line rounded-lg">
            <IconFolderOff size={32} className="text-muted mb-3" stroke={1.5} />
            <p className="text-parchment mb-1">No repositories connected yet</p>
            <p className="text-muted text-sm mb-5">
              Connect a repository to start scanning it on every push.
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="text-sm bg-sentinel text-ink font-medium px-4 py-2 rounded-md hover:opacity-90"
            >
              Connect repository
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <div key={repo._id} className="relative group">
              <RepoCard repo={repo} />
              <button
                onClick={() => setDisconnectTarget(repo)}
                className="absolute top-5 right-5 text-muted hover:text-critical opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Disconnect ${repo.fullName}`}
              >
                <IconTrash size={16} stroke={1.75} />
              </button>
            </div>
          ))}
        </div>
      </main>

      {showConnectModal && (
        <ConnectRepoModal onClose={() => setShowConnectModal(false)} onConnected={loadRepos} />
      )}

      {disconnectTarget && (
        <DisconnectModal
          repo={disconnectTarget}
          onClose={() => setDisconnectTarget(null)}
          onDisconnected={() => {
            setDisconnectTarget(null);
            loadRepos();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
