import { Link } from "react-router-dom";
import { IconLock, IconClock } from "@tabler/icons-react";

const RepoCard = ({ repo }) => {
  return (
    <Link
      to={`/repos/${repo._id}`}
      className="block bg-surface border border-line rounded-lg p-5 hover:border-sentinel transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-parchment text-sm truncate">{repo.fullName}</span>
        {repo.isPrivate && <IconLock size={14} className="text-muted shrink-0" />}
      </div>

      <div className="flex items-center gap-1.5 text-muted text-xs">
        <IconClock size={14} stroke={1.75} />
        {repo.lastScanAt
          ? `Last scanned ${new Date(repo.lastScanAt).toLocaleDateString()}`
          : "Not scanned yet"}
      </div>
    </Link>
  );
};

export default RepoCard;
