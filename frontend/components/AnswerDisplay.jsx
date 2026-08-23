'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Play, Pause, Sparkles, AlertTriangle, ShieldCheck, Globe, Headphones } from 'lucide-react';

export default function AnswerDisplay({ result }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const answerAudioUrl = result?.audioUrl || result?.audio_url;

  useEffect(() => {
    setIsPlaying(false);
    if (answerAudioUrl && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.log('Auto-play blocked by browser:', e);
      });
    }
  }, [answerAudioUrl, result]);

  if (!result) return null;

  const textAnswer = typeof result.answer === 'object' ? result.answer.text : result.answer;
  const isUngrounded = textAnswer?.includes("could not find enough information");

  const audioUsed = result.grounding?.audioUsed ?? true;
  const webUsed = result.grounding?.webUsed ?? false;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className={`glass-card rounded-2xl p-6 relative overflow-hidden transition-all ${
      isUngrounded ? 'border-amber-500/30' : 'border-indigo-500/30'
    }`}>
      {answerAudioUrl && (
        <audio
          ref={audioRef}
          src={answerAudioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isUngrounded ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold font-heading text-white">
            Grounded AI Spoken Answer
          </h3>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {audioUsed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Headphones className="w-3 h-3" />
              Audio Knowledge
            </span>
          )}

          {webUsed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Globe className="w-3 h-3" />
              Web Knowledge
            </span>
          )}

          {!isUngrounded ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Grounded Answer
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              Info Not Found
            </span>
          )}
        </div>
      </div>

      <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/80 mb-4">
        <p className="text-sm text-slate-200 leading-relaxed font-sans">
          "{textAnswer}"
        </p>
      </div>

      {answerAudioUrl && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={togglePlay}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isPlaying
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pause Spoken Answer
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                ▶ Play Spoken Answer
              </>
            )}
          </button>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Volume2 className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>AI Voice Synthesized</span>
          </div>
        </div>
      )}
    </div>
  );
}
