'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Volume2, Play, Pause, Sparkles, AlertTriangle, ShieldCheck, Globe, Headphones, Terminal } from 'lucide-react';
import RetrievedSources from '@/components/RetrievedSources';
import { getFullAudioUrl } from '@/config/api';

export default function AnswerDisplay({ result }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const rawAudioUrl = result?.audioUrl || result?.audio_url;
  const answerAudioUrl = getFullAudioUrl(rawAudioUrl);


  useEffect(() => {
    setIsPlaying(false);
    if (answerAudioUrl && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.log('Auto-play prevented by browser:', e);
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
    <div className={`firebase-card relative overflow-hidden ${
      isUngrounded ? 'border-amber-500/30' : 'border-blue-500/30'
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

      {/* Firebase Header Strip */}
      <div className="firebase-card-header flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isUngrounded ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Firebase ML Grounded Answer
            </h3>
            <p className="text-[11px] text-slate-400">
              Multimodal Gemini 1.5 Synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {audioUsed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <Headphones className="w-3 h-3 text-blue-400" />
              Audio Context
            </span>
          )}

          {webUsed && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              <Globe className="w-3 h-3 text-cyan-400" />
              Web Context
            </span>
          )}

          {!isUngrounded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Grounded
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Not Grounded
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Answer Text Block */}
        <div className="bg-slate-900/90 rounded-xl p-4 border border-white/10">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            "{textAnswer}"
          </p>
        </div>

        {/* Audio Player Controls */}
        {answerAudioUrl && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={togglePlay}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
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
                  Play Spoken Answer
                </>
              )}
            </button>

            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono">
              <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>Synthesized TTS Audio Stream</span>
            </div>
          </div>
        )}

        {/* Retrieved Audio Chunks Developer Drawer */}
        {result.sources && result.sources.length > 0 && (
          <div className="pt-2">
            <RetrievedSources sources={result.sources} />
          </div>
        )}
      </div>
    </div>
  );
}

