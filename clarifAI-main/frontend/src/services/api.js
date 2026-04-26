const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Token helpers ────────────────────────────────────────────────────────────
const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");
const setTokens = (access, refresh) => {
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
};
const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// ─── Core fetch with auto token refresh ──────────────────────────────────────
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  refreshQueue = [];
};

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        headers["Authorization"] = `Bearer ${newToken}`;
        return fetch(url, { ...options, headers });
      });
    }

    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      });
      const data = await refreshRes.json();
      if (!refreshRes.ok) throw new Error("Refresh failed");

      setTokens(data.data.accessToken, data.data.refreshToken);
      processQueue(null, data.data.accessToken);
      headers["Authorization"] = `Bearer ${data.data.accessToken}`;
      res = await fetch(url, { ...options, headers });
    } catch (err) {
      processQueue(err, null);
      clearTokens();
      window.dispatchEvent(new Event("auth:logout"));
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json.error || "Request failed");
    err.code = json.code;
    err.status = res.status;
    throw err;
  }
  return json;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: (name, email, password) =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiFetch("/auth/logout", { method: "POST" }).finally(clearTokens),

  me: () => apiFetch("/auth/me"),

  refresh: (refreshToken) =>
    apiFetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};

// ─── Detection API ────────────────────────────────────────────────────────────
export const detectionApi = {
  predict: (file) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch("/detection/predict", { method: "POST", body: form });
  },

  getResult: (id) => apiFetch(`/detection/result/${id}`),

  getHistory: (page = 1, limit = 10) =>
    apiFetch(`/detection/history?page=${page}&limit=${limit}`),
};

// ─── Token storage (used by AuthContext) ──────────────────────────────────────
export { setTokens, clearTokens, getAccessToken };
