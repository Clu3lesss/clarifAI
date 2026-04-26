import React, { useCallback } from "react";

const RISK_COLOR = {
  "Likely Fake": "red",
  "Uncertain":   "orange",
  "Real":        "green",
};

export default function ResultView({ result, onNewAnalysis }) {
  // If no real result yet, show placeholder (shouldn't normally happen)
  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-500">
        No result to display.
      </div>
    );
  }

  const {
    fileName = "uploaded_image",
    score = 0,
    label = "REAL",
    confidence = 0,
    riskLevel = "Real",
    faceDetected = false,
    heatmapB64 = null,
    processingTimeMs = 0,
    detectionId = "",
    warnings = [],
  } = result;

  const color = RISK_COLOR[riskLevel] ?? "green";
  const colorClasses = {
    red:    { banner: "bg-red-950/20 border-red-900/50 text-red-500", dot: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]", score: "text-red-500", bar: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]", badge: "bg-red-500/20 text-red-500" },
    orange: { banner: "bg-orange-950/20 border-orange-900/50 text-orange-400", dot: "bg-orange-400", score: "text-orange-400", bar: "bg-orange-400", badge: "bg-orange-500/20 text-orange-400" },
    green:  { banner: "bg-green-950/20 border-green-900/50 text-green-400", dot: "bg-green-400", score: "text-green-400", bar: "bg-green-400", badge: "bg-green-500/20 text-green-400" },
  }[color];

  const verdictLabel = label === "FAKE" ? "Likely deepfake" : label === "REAL" ? "Likely authentic" : "Uncertain";

  // #11: Implement Save Report — download JSON
  const handleSaveReport = useCallback(() => {
    const reportData = {
      detectionId,
      fileName,
      score,
      label,
      confidence,
      riskLevel,
      faceDetected,
      processingTimeMs,
      warnings,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clarifai-report-${detectionId || "result"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [detectionId, fileName, score, label, confidence, riskLevel, faceDetected, processingTimeMs, warnings]);

  // #11: Implement Download PDF — uses browser print dialog for a clean PDF
  const handleDownloadPDF = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ClarifAI Report — ${fileName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          h2 { font-size: 16px; color: #666; margin-bottom: 24px; font-weight: normal; }
          .verdict { padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; font-weight: bold; font-size: 18px; }
          .verdict.fake { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
          .verdict.real { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
          .verdict.uncertain { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          td { padding: 10px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          td:first-child { color: #6b7280; width: 180px; }
          td:last-child { font-weight: 500; }
          .heatmap { text-align: center; margin: 24px 0; }
          .heatmap img { max-width: 400px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>ClarifAI Detection Report</h1>
        <h2>${fileName} — ${new Date().toLocaleString()}</h2>
        <div class="verdict ${label === 'FAKE' ? 'fake' : label === 'REAL' ? 'real' : 'uncertain'}">
          Verdict: ${verdictLabel} — Score ${score}/100
        </div>
        <table>
          <tr><td>Risk Level</td><td>${riskLevel}</td></tr>
          <tr><td>Label</td><td>${label}</td></tr>
          <tr><td>Confidence</td><td>${confidence}%</td></tr>
          <tr><td>Face Detected</td><td>${faceDetected ? 'Yes' : 'No'}</td></tr>
          <tr><td>Detection Mode</td><td>${faceDetected ? 'Face-focused (MTCNN)' : 'Full-image'}</td></tr>
          <tr><td>Processing Time</td><td>${(processingTimeMs / 1000).toFixed(1)}s</td></tr>
          <tr><td>Detection ID</td><td>${detectionId}</td></tr>
        </table>
        ${heatmapB64 ? `<div class="heatmap"><h3 style="margin-bottom:12px;font-size:14px;color:#374151;">Grad-CAM Heatmap</h3><img src="data:image/png;base64,${heatmapB64}" alt="Heatmap" /></div>` : ''}
        ${warnings.length ? `<div style="background:#fffbeb;border:1px solid #fde68a;padding:12px 16px;border-radius:8px;color:#92400e;font-size:13px;margin-top:16px;">⚠ ${warnings.join(' | ')}</div>` : ''}
        <div class="footer">Generated by ClarifAI — Deepfake Detection Platform</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  }, [fileName, label, verdictLabel, score, riskLevel, confidence, faceDetected, processingTimeMs, detectionId, heatmapB64, warnings]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onNewAnalysis} className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-2">
            <span>&larr;</span> New analysis
          </button>
          <div className="w-px h-4 bg-zinc-800"></div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Result &mdash; <span className="font-normal text-zinc-300">{fileName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveReport}
            className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors mr-2"
          >
            Save report
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Download PDF
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-6">
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Heatmap section */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Grad-CAM heatmap</h2>
                  <p className="text-sm text-zinc-500">
                    {faceDetected ? "Face-focused · MTCNN crop applied" : "Full-image fallback · No face detected"}
                  </p>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-zinc-800/80 rounded-xl w-full aspect-[4/3] relative flex items-center justify-center overflow-hidden mb-4">
                {heatmapB64 ? (
                  <img
                    src={`data:image/png;base64,${heatmapB64.replace(/\s+/g, '')}`}
                    alt="Grad-CAM heatmap"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span className="text-sm">Heatmap will appear here after ML model completes</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5 text-zinc-300"><div className="w-2 h-2 rounded-full bg-red-500"></div> High suspicion</div>
                <div className="flex items-center gap-1.5 text-zinc-300"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Medium suspicion</div>
                <div className="flex items-center gap-1.5 text-zinc-300"><div className="w-2 h-2 rounded-full bg-green-500"></div> Low / authentic</div>
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl px-4 py-3 text-sm text-amber-400">
                {warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
              </div>
            )}

            {/* Raw JSON tab
            <div>
              <div className="flex gap-6 border-b border-zinc-800 mb-6">
                <button className="pb-3 text-sm font-medium text-blue-500 border-b-2 border-blue-500">Raw JSON</button>
              </div>
              <pre className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
            */}
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[340px] flex flex-col gap-4">
            {/* Verdict banner */}
            <div className={`border rounded-2xl p-5 flex items-center justify-between ${colorClasses.banner}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colorClasses.dot}`}></div>
                <span className="text-base font-semibold">{verdictLabel}</span>
              </div>
              <span className="text-sm font-medium">{riskLevel}</span>
            </div>

            {/* Score box */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
              <p className="text-sm font-medium text-zinc-400 mb-2">Deepfake risk score</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className={`text-6xl font-bold tracking-tighter ${colorClasses.score}`}>{score}</span>
                <span className="text-2xl font-medium text-zinc-600">/ 100</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {["0","25","50","75","100"].map((n) => (
                  <div key={n} className={`text-[10px] text-zinc-600 font-medium ${n === "0" ? "w-8 text-left" : n === "100" ? "w-8 text-right" : "flex-1 text-center"}`}>{n}</div>
                ))}
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden w-full relative">
                <div className={`absolute top-0 left-0 h-full rounded-full ${colorClasses.bar}`} style={{ width: `${score}%` }}></div>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-2">
              {[
                { label: "Authenticity", value: riskLevel, badge: true },
                { label: "Face detected", value: faceDetected ? "Yes" : "No" },
                { label: "Detection mode", value: faceDetected ? "Face-focused" : "Full-image" },
                { label: "Confidence", value: `${confidence}%` },
              ].map(({ label: l, value: v, badge }) => (
                <div key={l} className="flex items-center justify-between bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
                  <span className="text-sm text-zinc-400 font-medium">{l}</span>
                  {badge ? (
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${colorClasses.badge}`}>{v}</span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-medium">{v}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Timing / ID */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">Detection time</span>
                <span className="text-sm font-semibold text-zinc-200">{(processingTimeMs / 1000).toFixed(1)}s</span>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-medium">Report ID</span>
                <span className="text-sm font-semibold text-zinc-200 truncate ml-1">#{String(detectionId).slice(-5)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
