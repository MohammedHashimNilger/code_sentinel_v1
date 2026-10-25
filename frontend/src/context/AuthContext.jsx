import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Starts true because on first load we don't yet know if the user has
  // a valid session cookie - ProtectedRoute needs to wait for this to
  // resolve before deciding whether to redirect to login.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.user);
    } catch (error) {
      // A 401 here just means "not logged in" - not an error worth
      // surfacing to the user, since this runs automatically on every
      // page load including the login page itself.
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Login isn't an API call - it's a full page navigation to the
  // backend's OAuth start route, which redirects to GitHub. There's no
  // JSON response to handle client-side; the browser ends up back on
  // /dashboard with the session cookie already set once the flow
  // completes.
  const login = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/github`;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
