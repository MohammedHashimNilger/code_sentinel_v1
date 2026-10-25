import axios from "axios";

// withCredentials: true is required for the httpOnly JWT cookie to be
// sent on every request - without it, the browser won't attach the
// cookie to cross-origin requests even if it's set, and every protected
// route would 401.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export default api;
