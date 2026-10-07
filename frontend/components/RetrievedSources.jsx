'use client';

import React, { useState } from 'react';
import { Layers, Play, Pause, Clock, Award, ChevronDown, ChevronUp, Database, Code2 } from 'lucide-react';
import { getFullAudioUrl } from '@/config/api';

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

    const fullUrl = getFullAudioUrl(chunk.chunk_audio_url);
    const audio = new Audio(fullUrl);
    audio.play();

    setActiveChunkId(chunk.chunk_id);
    setPlayingAudio(audio);

    audio.onended = () => {
      setActiveChunkId(null);
      setPlayingAudio(null);
    };
  };

  return (
    <div className="bg-slate-900/90 rounded-xl p-3.5 border border-white/10">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none group"
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 font-mono group-hover:text-blue-400 transition-colors">
              Qdrant Vector Inspection Panel ({sources.length} Chunks)
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
            768-dim Cosine
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Internal Chunks Panel */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {sources.map((source, idx) => {
              const scorePercent = Math.round(source.score * 100);
              const isCurrentlyPlaying = activeChunkId === source.chunk_id;

              return (
                <div
                  key={source.chunk_id || idx}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrentlyPlaying
                      ? 'bg-blue-950/60 border-blue-500/50'
                      : 'bg-slate-950/60 border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-slate-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {formatSeconds(source.start_time)} – {formatSeconds(source.end_time)}
                    </span>

                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-400" />
                      {scorePercent}% Cosine
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                      {source.chunk_id}
                    </span>

                    <button
                      onClick={() => handlePlayChunk(source)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1 transition-colors ${
                        isCurrentlyPlaying
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
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
                          ▶ Play WAV
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

