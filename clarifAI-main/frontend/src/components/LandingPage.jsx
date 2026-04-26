import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      <div className="max-w-[1200px] w-full mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-20 relative z-10 items-center">

        {/* Left Side: Typography & Copy */}
        <div className="flex flex-col justify-center">
          <h1 className="text-6xl sm:text-[5.5rem] leading-[1.05] font-black tracking-tighter mb-8" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontStretch: 'expanded' }}>
            <span className="block text-[#f4f4f5]">Detect</span>
            <span className="block text-[#ff4b4b]">Deepfakes</span>
            <span className="block flex items-center flex-wrap gap-x-4">
              <span className="text-[#f4f4f5]">with</span>
              <span className="text-[#3b82f6]">Clarity</span>
            </span>
            <span className="block text-[#f4f4f5]">&amp;</span>
            <span className="block text-[#f4f4f5]">Confidence</span>
          </h1>

          <p className="text-[17px] text-zinc-400 mb-10 leading-relaxed max-w-lg">
            Upload any image and get an instant verdict &mdash; real or fake &mdash;
            complete with a Grad-CAM heatmap showing exactly <span className="italic text-zinc-300">where</span> the manipulation occurred.
            Built for journalists, KYC teams, and everyday users.
          </p>

          <div className="flex flex-wrap gap-3 mb-12">
            <div className="px-4 py-2 rounded-full border border-blue-900/50 bg-[#172136] text-blue-400 text-sm font-medium flex items-center gap-2">
              <span className="text-orange-500">⚡</span> &lt;3s Detection
            </div>
            <div className="px-4 py-2 rounded-full border border-blue-900/50 bg-[#172136] text-blue-400 text-sm font-medium flex items-center gap-2">
              <span className="text-blue-300">🔬</span> Grad-CAM Heatmaps
            </div>
            <div className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-sm font-medium">
              EfficientNet-B4
            </div>
            <div className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-sm font-medium">
              Score out of 100
            </div>
            <div className="px-4 py-2 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-sm font-medium">
              API Access
            </div>
          </div>

          <div className="flex gap-8 mb-10 items-center">
            <div>
              <div className="text-[2.5rem] font-bold text-white mb-1 tracking-tight">1,284</div>
              <div className="text-sm text-zinc-500 font-medium">Images Analysed</div>
            </div>
            <div className="w-px h-12 bg-zinc-800"></div>
            <div>
              <div className="text-[2.5rem] font-bold text-[#ff4b4b] mb-1 tracking-tight">312</div>
              <div className="text-sm text-zinc-500 font-medium">Deepfakes Flagged</div>
            </div>
            <div className="w-px h-12 bg-zinc-800"></div>
            <div>
              <div className="text-[2.5rem] font-bold text-[#22c55e] mb-1 tracking-tight">2.3<span className="text-2xl uppercase">s</span></div>
              <div className="text-sm text-zinc-500 font-medium">Avg. Detection</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm font-medium text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Images deleted after analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Open-source model
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#22c55e]">✓</span> Self-hostable
            </div>
          </div>
        </div>

        {/* Right Side: CTA Card */}
        <div className="flex items-center justify-center lg:justify-end w-full">
          <div className="w-full max-w-[440px] bg-[#16161a] border border-zinc-800 rounded-2xl p-8 relative shadow-2xl">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent rounded-t-2xl"></div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Get started free</h2>
              <p className="text-zinc-400 text-sm">Join and start detecting deepfakes with ClarifAI</p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 mb-8">
              <button
                id="landing-signin-btn"
                onClick={() => navigate('/login', { state: { tab: 'login' } })}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#5a6bf5] to-[#7f63f4] hover:opacity-90 text-white font-semibold text-sm shadow-[0_0_20px_rgba(90,107,245,0.25)] transition-all"
              >
                Sign In
              </button>
              <button
                id="landing-register-btn"
                onClick={() => navigate('/login', { state: { tab: 'register' } })}
                className="w-full py-3.5 rounded-xl bg-[#101014] hover:bg-[#18181c] border border-zinc-700 text-zinc-200 font-semibold text-sm transition-all"
              >
                Create Account
              </button>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-[1px] bg-zinc-800"></div>
              <span className="text-[13px] font-medium text-zinc-500">or continue with</span>
              <div className="flex-1 h-[1px] bg-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[#101014] hover:bg-[#18181c] border border-zinc-800 rounded-xl text-zinc-300 font-medium text-sm flex items-center justify-center gap-3 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-[13px] text-zinc-500 mt-8">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login', { state: { tab: 'login' } })}
                className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
