import { useState } from "react";
import api from "../api/axios.js";
import Modal from "./Modal.jsx";
import { getErrorMessage } from "../utils/score.js";

const DisconnectModal = ({ repo, onClose, onDisconnected }) => {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // The button stays disabled until the typed text matches exactly. The
  // backend re-checks this independently - the client-side check is only
  // there so the user gets immediate feedback, not as the real safeguard.
  const matches = confirmText === repo.fullName;

  const handleDisconnect = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.delete(`/api/repos/${repo._id}`, { data: { confirmFullName: confirmText } });
      onDisconnected();
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Disconnect repository" onClose={onClose}>
      <p className="text-muted text-sm leading-relaxed mb-4">
        This removes the GitHub webhook and permanently deletes every scan and issue recorded for{" "}
        <span className="font-mono text-parchment">{repo.fullName}</span>. This cannot be undone.
      </p>

      <label className="block text-sm text-muted mb-2" htmlFor="confirm-name">
        Type <span className="font-mono text-parchment">{repo.fullName}</span> to confirm
      </label>
      <input
        id="confirm-name"
        type="text"
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        className="w-full bg-ink border border-line rounded-md px-3 py-2 text-parchment font-mono text-sm mb-4 focus:outline-none focus:border-critical"
        autoComplete="off"
      />

      {error && <p className="text-critical text-sm mb-4">{error}</p>}

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="text-sm text-muted hover:text-parchment px-3 py-2">
          Cancel
        </button>
        <button
          onClick={handleDisconnect}
          disabled={!matches || submitting}
          className="text-sm bg-critical text-white font-medium px-4 py-2 rounded-md disabled:opacity-40"
        >
          {submitting ? "Disconnecting..." : "Disconnect repository"}
        </button>
      </div>
    </Modal>
  );
};

export default DisconnectModal;
