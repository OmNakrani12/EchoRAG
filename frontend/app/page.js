'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import AudioUploader from '@/components/AudioUploader';
import VoiceRecorder from '@/components/VoiceRecorder';
import AnswerDisplay from '@/components/AnswerDisplay';
import ConversationHistory from '@/components/ConversationHistory';

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
        sources: [],
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Hero / Intro Section */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold font-heading tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-300">
            Native Audio Retrieval-Augmented Generation
          </h2>
          <p className="text-sm text-slate-400">
            Upload knowledge audio recordings, ask questions via microphone, and hear grounded AI spoken answers.
          </p>
        </div>

        {/* Dashboard Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Knowledge Audio & Voice Question */}
          <div className="space-y-8">
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

          {/* Right Column: Grounded AI Spoken Answer & Conversation History */}
          <div className="space-y-8">
            {currentResult ? (
              <AnswerDisplay result={currentResult} />
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 border border-dashed border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse-slow">
                  <span className="text-2xl">🎧</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200 font-heading">
                    Ready for AI Voice Answering
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Upload an audio recording on the left, then record your spoken question to hear the AI's spoken answer.
                  </p>
                </div>
              </div>
            )}

            <ConversationHistory history={history} />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>VoiceRAG • Built with Next.js, FastAPI, Gemini Embedding 2, Qdrant & Gemini Multimodal</p>
          <p className="text-slate-400">End-to-End Grounded Voice System</p>
        </div>
      </footer>
    </div>
  );
}
