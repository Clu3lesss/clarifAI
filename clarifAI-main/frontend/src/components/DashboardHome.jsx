import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { detectionApi } from "../services/api";

const VERDICT_STYLES = {
  FAKE:  "bg-red-900/40 text-red-400 border border-red-700/50",
  REAL:  "bg-green-900/40 text-green-400 border border-green-700/50",
  UNCERTAIN: "bg-amber-900/40 text-amber-400 border border-amber-700/50",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [recent, setRecent] = useState([]);
  const [stats, setStats] = useState({ total: 0, fakes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      detectionApi.getHistory(1, 4),
      detectionApi.getHistory(1, 50), // fetch larger batch for accurate fake count
    ])
      .then(([recentRes, allRes]) => {
        const dets = recentRes.data.detections;
        setRecent(dets);
        setStats({
          total: recentRes.data.pagination.total,
          fakes: allRes.data.detections.filter((d) => d.label === "FAKE").length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const STATS = [
    { value: stats.total.toLocaleString(), label: "Images analysed", change: "Your lifetime total", changeType: "neutral" },
    { value: stats.fakes.toString(), label: "Deepfakes flagged", change: "From recent scans", changeType: stats.fakes > 0 ? "negative" : "positive", valueColor: stats.fakes > 0 ? "text-red-400" : "text-zinc-100" },
    { value: user?.detectionCount?.toString() ?? "0", label: "Your total scans", change: "Account lifetime", changeType: "neutral" },
  ];

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
          {user && <p className="text-sm text-zinc-500 mt-0.5">Welcome back, {user.name}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard/analyse")}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-medium text-white transition-colors"
          >
            + Analyse new image
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm font-medium text-zinc-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5">
              <p className={`text-3xl font-semibold mb-1 tracking-tight ${stat.valueColor ?? "text-zinc-100"}`}>
                {stat.value}
              </p>
              <p className="text-sm text-zinc-400 mb-3">{stat.label}</p>
              <p className={`text-xs font-medium ${stat.changeType === "positive" ? "text-green-400" : stat.changeType === "negative" ? "text-red-400" : "text-zinc-500"}`}>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Recent detections */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">Recent Detections</p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 px-6 py-3 border-b border-zinc-800 bg-zinc-800/40">
              {["File", "Verdict", "Score", "Time"].map((h) => (
                <span key={h} className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {loading ? (
              <div className="px-6 py-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="px-6 py-10 flex flex-col items-center gap-3 text-zinc-500">
                <span className="text-3xl">🔍</span>
                <p className="text-sm">No detections yet. Upload your first image to get started.</p>
                <button onClick={() => navigate("/dashboard/analyse")} className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-medium text-white transition-colors">
                  Run first analysis
                </button>
              </div>
            ) : (
              recent.map((row, i) => (
                <div key={row._id}
                  className={`grid grid-cols-4 px-6 py-4 items-center hover:bg-zinc-800/40 transition-colors cursor-pointer ${i < recent.length - 1 ? "border-b border-zinc-800/60" : ""}`}
                >
                  <span className="text-sm font-medium text-zinc-200 truncate pr-4">{row.originalName}</span>
                  <span>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${VERDICT_STYLES[row.label] ?? VERDICT_STYLES.UNCERTAIN}`}>
                      {row.label === "FAKE" ? "Deepfake" : row.label === "REAL" ? "Real" : "Uncertain"}
                    </span>
                  </span>
                  <span className="text-sm text-zinc-300 font-mono">{row.score} / 100</span>
                  <span className="text-sm text-zinc-500">{timeAgo(row.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
