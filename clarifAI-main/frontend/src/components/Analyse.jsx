import { useState, useRef, useEffect } from "react";
import ResultView from "./ResultView";
import { detectionApi } from "../services/api";

export default function Analyse() {
  const [viewTab, setViewTab] = useState("input");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();

  // Fix #25: Revoke blob URL on cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }
    setError("");
    setSelectedFile(file);
    // Revoke old preview URL before creating a new one
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const runDetection = async () => {
    if (!selectedFile) { setError("Please select an image first."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await detectionApi.predict(selectedFile);
      setResult({ ...res.data, fileName: selectedFile.name });
      setViewTab("result");
    } catch (err) {
      setError(err.message || "Detection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAnalysis = () => {
    setViewTab("input");
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setError("");
  };

  if (viewTab === "result") {
    return <ResultView result={result} onNewAnalysis={handleNewAnalysis} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Analyse image</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-xl">
            <button
              className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${viewTab === "input" ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
              onClick={() => setViewTab("input")}
            >Input view</button>
            <button
              disabled={!result}
              className={`px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${viewTab === "result" ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}
              onClick={() => result && setViewTab("result")}
            >Result view</button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl mx-auto w-full">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-16 mb-6 cursor-pointer transition-all group ${dragging ? "border-blue-500 bg-blue-950/20" : "border-[#234b76] bg-[#142640]/40 hover:bg-[#142640]/60"}`}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img src={preview} alt="Selected" className="max-h-48 rounded-xl border border-zinc-700 object-contain" />
                <p className="text-sm text-zinc-400 font-medium">{selectedFile?.name} · {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
                <p className="text-xs text-zinc-500">Click to change image</p>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 bg-amber-500/20 text-amber-500 rounded-xl mb-4 flex items-center justify-center text-3xl group-hover:scale-105 transition-transform">📁</div>
                <p className="text-lg font-semibold text-zinc-100 mb-2">Drop your image here</p>
                <p className="text-sm text-zinc-400 font-medium">JPG, PNG, WebP · Max 10 MB · One image at a time</p>
              </>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          {/* Run detection button */}
          <div className="flex justify-end mb-8">
            <button
              onClick={runDetection}
              disabled={loading || !selectedFile}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors whitespace-nowrap flex items-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? "Analysing..." : "Run detection"}
            </button>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { title: "Face-focused analysis", desc: "MTCNN automatically crops and aligns the face region before running the model. Best for portrait photos and ID documents." },
              { title: "Full-image fallback", desc: "When no face is detected, EfficientNet-B4 runs on the entire image for scene-level forgery checks." },
            ].map((m) => (
              <div key={m.title}
                className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30"
              >
                <h3 className="text-sm font-semibold text-zinc-200 mb-2">{m.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed pr-4">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
