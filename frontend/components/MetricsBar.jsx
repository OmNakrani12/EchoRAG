'use client';

import React from 'react';
import { BarChart2, MoreVertical, TrendingUp, ExternalLink, Menu } from 'lucide-react';

export default function MetricsBar({ activeFile, historyCount = 0 }) {
  return (
    <div className="space-y-3">
      {/* Section Header matching Screenshot */}
      <div className="flex items-center justify-between text-slate-200">
        <h2 className="text-xl font-medium tracking-tight">Analytics</h2>
        <button className="text-slate-400 hover:text-white p-1">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Main Analytics Card matching Screenshot */}
      <div className="firebase-card p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-[#2c2c2c]">
          <div className="flex items-center space-x-2 text-slate-200 font-medium">
            <BarChart2 className="w-5 h-5 text-slate-400" />
            <span>Analytics</span>
          </div>

          <button className="text-slate-400 hover:text-white p-1">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Column 1: Daily active users */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400">Daily active queries</p>
            <p className="text-xl font-bold font-mono text-slate-300">
              {historyCount > 0 ? historyCount : '— — —'}
            </p>
            <p className="text-[11px] text-slate-500">
              {historyCount > 0 ? `${historyCount} queries in current session` : 'No data for the last 14 days'}
            </p>
          </div>

          {/* Column 2: Day 1 retention / Audio Chunks */}
          <div className="space-y-2 border-l border-[#2c2c2c] md:pl-6">
            <p className="text-xs font-medium text-slate-400">Indexed audio chunks</p>
            <p className="text-xl font-bold font-mono text-slate-300">
              {activeFile ? `${activeFile.total_chunks} chunks` : '— — —'}
            </p>
            <p className="text-[11px] text-slate-500">
              {activeFile ? activeFile.filename : 'No data for the last 14 days'}
            </p>
          </div>

          {/* Column 3: Revenue / S3 Storage widget matching Screenshot */}
          <div className="bg-[#242424] p-4 rounded-xl border border-[#333] flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>

            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-200">Track your audio RAG!</p>
              <a href="#vector" className="text-cyan-400 hover:underline block text-[11px] flex items-center gap-1">
                Inspect Qdrant Vectors <ExternalLink className="w-3 h-3" />
              </a>
              <a href="#s3" className="text-cyan-400 hover:underline block text-[11px] flex items-center gap-1">
                View S3 Storage Files <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
