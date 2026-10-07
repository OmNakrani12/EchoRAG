'use client';

import React from 'react';
import { History, User, Bot, Volume2, ShieldCheck, Terminal } from 'lucide-react';
import { getFullAudioUrl } from '@/config/api';

export default function ConversationHistory({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="firebase-card relative overflow-hidden">
      {/* Firebase Header */}
      <div className="firebase-card-header flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Execution Audit Ledger
            </h3>
            <p className="text-[11px] text-slate-400">
              Session Query & Answer Logs ({history.length} Turns)
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
          Firebase Log Stream
        </span>
      </div>

      <div className="p-4 space-y-3 max-h-[380px] overflow-y-auto">
        {history.slice().reverse().map((turn, idx) => (
          <div key={idx} className="bg-slate-900/90 rounded-xl p-3.5 border border-white/5 space-y-3">
            {/* User Question Block */}
            <div className="flex items-start space-x-2.5">
              <div className="w-6 h-6 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold font-mono text-purple-300">Spoken Question #{history.length - idx}</span>
                  <span className="text-[10px] font-mono text-slate-500">{turn.timestamp || 'Just now'}</span>
                </div>
                {turn.questionAudioUrl && (
                  <audio controls src={getFullAudioUrl(turn.questionAudioUrl)} className="h-7 max-w-[220px] mt-1.5 accent-purple-500" />
                )}
              </div>
            </div>

            {/* AI Grounded Answer Block */}
            <div className="flex items-start space-x-2.5 pt-2.5 border-t border-white/5">
              <div className="w-6 h-6 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold font-mono text-blue-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Grounded AI Answer
                  </span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-lg text-xs text-slate-200 mt-1.5 border border-white/5">
                  "{turn.answer}"
                </div>
                {turn.audio_url && (
                  <div className="mt-2">
                    <audio controls src={getFullAudioUrl(turn.audio_url)} className="h-7 max-w-[220px] accent-blue-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


