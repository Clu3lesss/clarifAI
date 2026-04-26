import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi, setTokens, clearTokens } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // checking session on mount

  // On mount: restore session if tokens exist
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.data.user))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  // Listen for forced logouts from apiFetch (expired refresh token)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    setTokens(res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const res = await authApi.register(name, email, password);
    setTokens(res.data.accessToken, res.data.refreshToken);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
