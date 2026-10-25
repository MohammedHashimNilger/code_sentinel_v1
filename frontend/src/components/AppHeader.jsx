import { Link } from "react-router-dom";
import { IconLogout, IconShieldCheck } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext.jsx";

const AppHeader = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-line">
      <Link to="/dashboard" className="flex items-center gap-2">
        <IconShieldCheck size={24} className="text-sentinel" stroke={1.75} />
        <span className="font-mono text-parchment">CodeSentinel</span>
      </Link>

      <div className="flex items-center gap-4">
        {user?.avatarUrl && (
          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
        )}
        <span className="text-parchment text-sm hidden sm:inline">{user?.username}</span>
        <button
          onClick={logout}
          className="text-muted hover:text-parchment transition-colors"
          aria-label="Log out"
        >
          <IconLogout size={20} stroke={1.75} />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
