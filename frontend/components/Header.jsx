'use client';

import React from 'react';
import { Mic, Radio, Database, Cpu } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Radio className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                  VoiceRAG
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Native Audio RAG
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multimodal Audio Question Answering • Zero Transcript Vector Retrieval
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Gemini Embedding 2</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>Qdrant Vector DB</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
