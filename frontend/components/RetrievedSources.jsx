'use client';

import React, { useState } from 'react';
import { Layers, Play, Pause, Clock, Award, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export default function RetrievedSources({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChunkId, setActiveChunkId] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);

  if (!sources || sources.length === 0) return null;

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayChunk = (chunk) => {
    if (playingAudio) {
      playingAudio.pause();
      if (activeChunkId === chunk.chunk_id) {
        setActiveChunkId(null);
        setPlayingAudio(null);
        return;
      }
    }

    const audio = new Audio(chunk.chunk_audio_url);
    audio.play();
    setActiveChunkId(chunk.chunk_id);
    setPlayingAudio(audio);

    audio.onended = () => {
      setActiveChunkId(null);
      setPlayingAudio(null);
    };
  };

  return (
    <div className="glass-card rounded-2xl p-4 border border-slate-800/80 bg-slate-950/40">
      {/* Collapsible Header for Debug/Dev Mode */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none group"
      >
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 flex items-center justify-center group-hover:text-indigo-400 transition-colors">
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-300 font-heading group-hover:text-white transition-colors">
              Developer Debug: Internal Retrieval Chunks
            </span>
            <p className="text-[11px] text-slate-500">
              {sources.length} knowledge segments used internally as LLM context
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            Internal RAG State
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Internal Chunks Panel (Hidden by default) */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.map((source, idx) => {
              const scorePercent = Math.round(source.score * 100);
              const isCurrentlyPlaying = activeChunkId === source.chunk_id;

              return (
                <div
                  key={source.chunk_id || idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrentlyPlaying
                      ? 'bg-indigo-950/60 border-indigo-500/50 shadow-md'
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {formatSeconds(source.start_time)} – {formatSeconds(source.end_time)}
                    </span>

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      {scorePercent}% Similarity
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                      {source.chunk_id}
                    </span>

                    <button
                      onClick={() => handlePlayChunk(source)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        isCurrentlyPlaying
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isCurrentlyPlaying ? (
                        <>
                          <Pause className="w-3 h-3 fill-current" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          ▶ Play Audio
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
