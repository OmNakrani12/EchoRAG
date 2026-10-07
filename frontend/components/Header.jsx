'use client';

import React from 'react';
import { Flame, Database, Cpu, ExternalLink } from 'lucide-react';

export default function Header({ activeFile }) {
  return (
    <header className="bg-[#1a1a1a] border-b border-[#2c2c2c] px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white tracking-tight">
                EchoRAG
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Native Audio RAG
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multimodal Spoken Question Answering • Zero Transcript Vector Retrieval
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-[#242424] text-emerald-400 border border-[#333] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Qdrant Vector DB
          </span>

          <span className="px-2.5 py-1 rounded bg-[#242424] text-blue-400 border border-[#333] flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            Gemini 1.5 Flash
          </span>

          <a 
            href="https://echorag-cm29.onrender.com/health" 
            target="_blank" 
            rel="noreferrer"
            className="px-2.5 py-1 rounded bg-[#242424] hover:bg-[#2e2e2e] text-slate-300 border border-[#333] flex items-center gap-1.5 transition-colors"
          >
            Render Backend <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </header>
  );
}
