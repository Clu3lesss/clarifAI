import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      
      <div className="relative z-10 text-center max-w-md flex flex-col items-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        
        <h1 className="text-7xl font-black text-white tracking-tighter mb-2" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          404
        </h1>
        <h2 className="text-xl font-semibold text-zinc-300 mb-4">Page not found</h2>
        
        <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
          The page you are looking for doesn't exist, has been moved, or is temporarily unavailable.
        </p>
        
        <Link 
          to="/" 
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold text-sm transition-colors shadow-lg"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
