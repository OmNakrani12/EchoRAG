'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import AudioUploader from '@/components/AudioUploader';
import VoiceRecorder from '@/components/VoiceRecorder';
import AnswerDisplay from '@/components/AnswerDisplay';
import ConversationHistory from '@/components/ConversationHistory';
import { Terminal } from 'lucide-react';

export default function Home() {
  const [activeFile, setActiveFile] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [history, setHistory] = useState([]);

  const handleAudioUploaded = (fileData) => {
    setActiveFile(fileData);
  };

  const handleQuerySubmitted = (result, questionAudioUrl) => {
    setCurrentResult(result);
    
    setHistory((prev) => [
      ...prev,
      {
        questionAudioUrl: questionAudioUrl,
        answer: typeof result.answer === 'object' ? result.answer.text : result.answer,
        audio_url: result.audioUrl || result.audio_url,
        sources: result.sources || [],
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-slate-100 font-sans">
      {/* Top Header Bar */}
      <Header activeFile={activeFile} />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Knowledge Audio Repository & Voice Question Studio */}
          <div className="space-y-6">
            <AudioUploader
              onAudioUploaded={handleAudioUploaded}
              activeFile={activeFile}
            />

            <VoiceRecorder
              onQuerySubmitted={handleQuerySubmitted}
              activeFileId={activeFile?.file_id}
              history={history}
            />
          </div>

          {/* Right Column: Grounded AI Voice Answer & Session Conversation History */}
          <div className="space-y-6">
            {currentResult ? (
              <AnswerDisplay result={currentResult} />
            ) : (
              <div className="firebase-card p-12 text-center flex flex-col items-center justify-center space-y-3 border-dashed border-[#333]">
                <div className="w-14 h-14 rounded-2xl bg-[#242424] border border-[#333] flex items-center justify-center text-blue-400">
                  <Terminal className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">
                    Ready for AI Voice Answering
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Upload an audio recording on the left, then record your spoken question to hear the AI's grounded voice answer.
                  </p>
                </div>
              </div>
            )}

            <ConversationHistory history={history} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2c2c2c] bg-[#1a1a1a] py-4 px-6 text-xs text-slate-400 flex items-center justify-between">
        <p className="font-mono text-[11px]">
          EchoRAG • Next.js 14, FastAPI, Qdrant Vector DB, AWS S3, Gemini Multimodal
        </p>
        <span className="text-emerald-400 flex items-center gap-1.5 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Backend Connected
        </span>
      </footer>
    </div>
  );
}
