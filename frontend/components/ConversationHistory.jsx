'use client';

import React from 'react';
import { MessageSquare, User, Bot, Volume2 } from 'lucide-react';

export default function ConversationHistory({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold font-heading text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          Session Conversation History
        </h3>
        <span className="text-xs text-slate-400">
          {history.length} Exchanged Turn{history.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
        {history.map((turn, idx) => (
          <div key={idx} className="space-y-2 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            {/* User Question */}
            <div className="flex items-start space-x-2.5">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-purple-300">User Spoken Question</p>
                {turn.questionAudioUrl && (
                  <audio controls src={turn.questionAudioUrl} className="h-7 max-w-[200px] mt-1" />
                )}
              </div>
            </div>

            {/* AI Grounded Response */}
            <div className="flex items-start space-x-2.5 pt-2 border-t border-slate-800/50">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-indigo-300">VoiceRAG Grounded Answer</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  "{turn.answer}"
                </p>
                {turn.audio_url && (
                  <div className="mt-2 flex items-center space-x-2">
                    <audio controls src={turn.audio_url} className="h-7 max-w-[200px]" />
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
