import React, { useState, useEffect, useCallback } from "react";
import { detectionApi } from "../services/api";

const VERDICT_STYLES = {
  FAKE:      { label: "Deepfake", cls: "bg-red-500/10 text-red-500",    bar: "bg-red-500" },
  REAL:      { label: "Real",     cls: "bg-green-500/10 text-green-500", bar: "bg-green-500" },
  UNCERTAIN: { label: "Uncertain",cls: "bg-orange-500/10 text-orange-500",bar:"bg-orange-500"},
};

function verdictStyle(label) {
  return VERDICT_STYLES[label] ?? VERDICT_STYLES.UNCERTAIN;
}

export default function Reports() {
  const [detections, setDetections] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const fetchHistory = useCallback(async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await detectionApi.getHistory(page, 10);
      setDetections(res.data.detections);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const filtered = detections.filter((d) => {
    const matchFilter = filter === "All" || d.label === filter.toUpperCase() ||
      (filter === "Deepfake" && d.label === "FAKE");
    const matchSearch = !search ||
      d.originalName?.toLowerCase().includes(search.toLowerCase()) ||
      d.label?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0E] text-zinc-100 font-sans p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Reports</h1>
          <p className="text-sm text-zinc-400">Detection history and full report details</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fetchHistory(pagination.page)} className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by filename or verdict..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-[#131317] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
        />
        <div className="flex bg-[#131317] border border-zinc-800 rounded-xl p-1">
          {["All", "Deepfake", "Real", "Uncertain"].map((f) => (
            <button key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === f ? "bg-zinc-800/80 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800/40"}`}
            >{f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#131317] border border-zinc-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <span className="text-4xl">📭</span>
            <p className="text-sm">No detections found. Run your first analysis!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="px-6 py-4">File Name</th>
                  <th className="px-6 py-4">Verdict</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Face</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filtered.map((d) => {
                  const vs = verdictStyle(d.label);
                  return (
                    <tr key={d._id} className="group hover:bg-zinc-900/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="text-sm font-medium text-zinc-200 mb-0.5 truncate max-w-[200px]">{d.originalName}</div>
                        <div className="text-[11px] text-zinc-500">{(d.fileSizeBytes / 1024).toFixed(0)} KB · {d.mimeType}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${vs.cls}`}>{vs.label}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1.5 w-24">
                          <div className="text-sm font-medium text-zinc-300">{d.score} <span className="text-zinc-600">/ 100</span></div>
                          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${vs.bar}`} style={{ width: `${d.score}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium ${d.faceDetected ? "text-green-400" : "text-zinc-500"}`}>
                          {d.faceDetected ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-[13px] text-zinc-300">{new Date(d.createdAt).toLocaleDateString()}</div>
                        <div className="text-[11px] text-zinc-500">{new Date(d.createdAt).toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 mt-auto">
            <p className="text-[13px] text-zinc-500">
              Showing {detections.length} of {pagination.total} results
            </p>
            <div className="flex items-center gap-1">
              <button disabled={pagination.page === 1} onClick={() => fetchHistory(pagination.page - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                ‹
              </button>
              {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => fetchHistory(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${p === pagination.page ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}>
                  {p}
                </button>
              ))}
              <button disabled={pagination.page === pagination.pages} onClick={() => fetchHistory(pagination.page + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 disabled:opacity-40 transition-colors">
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
