'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Send, Loader2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

export default function VoiceRecorder({ onQuerySubmitted, activeFileId, history = [] }) {

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [queryStep, setQueryStep] = useState('');
  const [micError, setMicError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setMicError(null);
    setAudioBlob(null);
    setAudioUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone error:', err);
      setMicError('Could not access microphone. Please allow microphone permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setMicError(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const submitVoiceQuery = async () => {
    if (!audioBlob) return;

    setLoading(true);
    setQueryStep('Processing question audio & performing vector search in Qdrant...');

    const formData = new FormData();
    formData.append('question_audio', audioBlob, 'spoken_question.wav');
    if (activeFileId) {
      formData.append('file_id', activeFileId);
    }
    if (history && history.length > 0) {
      const formattedHistory = history.map(h => ({
        question: "Previous Spoken Question",
        answer: h.answer
      }));
      formData.append('history', JSON.stringify(formattedHistory));
    }

    try {
      const steps = [
        'Retrieving knowledge audio context from Qdrant vector database...',
        'Synthesizing contextual Multimodal answer from retrieved knowledge...',
        'Generating final TTS spoken audio response...'
      ];

      let sIndex = 0;
      const interval = setInterval(() => {
        if (sIndex < steps.length) {
          setQueryStep(steps[sIndex]);
          sIndex++;
        }
      }, 1000);

      const response = await fetch(`${API_BASE_URL}/api/query`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        let errMsg = 'Voice query failed';
        try {
          const errData = await response.json();
          errMsg = errData.detail || errData.message || errMsg;
        } catch (_) {
          try {
            const textErr = await response.text();
            errMsg = textErr || response.statusText || errMsg;
          } catch (e2) {
            errMsg = response.statusText || errMsg;
          }
        }
        throw new Error(errMsg);
      }

      const result = await response.json();
      setLoading(false);
      setQueryStep('');
      onQuerySubmitted(result, audioUrl);

    } catch (err) {
      console.error('Query error:', err);
      setMicError(err.message || 'Failed to process voice query.');
      setLoading(false);
      setQueryStep('');
    }
  };

  return (
    <div className="firebase-card relative overflow-hidden">
      {/* Firebase Card Header */}
      <div className="firebase-card-header flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Voice Query Studio
            </h3>
            <p className="text-[11px] text-slate-400">
              Native Multimodal Audio RAG Console
            </p>
          </div>
        </div>

        <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded border border-white/10 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          {activeFileId ? 'Audio Context Active' : 'Global Web Search Mode'}
        </span>
      </div>

      <div className="p-5">
        {micError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-900/50 rounded-xl border border-white/5">
            <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
            <p className="text-xs font-semibold text-blue-300 font-mono animate-pulse">{queryStep}</p>
            <p className="text-[11px] text-slate-500">Gemini 1.5 Multimodal Fusion & Qdrant Cosine Retrieval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {!audioUrl && !isRecording && (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-xl border border-white/5">
                <button
                  onClick={startRecording}
                  className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all hover:scale-105 mb-3"
                >
                  <Mic className="w-7 h-7" />
                </button>
                <p className="text-xs font-semibold text-slate-200">
                  Click microphone to start recording your question
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Speaks directly to Qdrant vector database & Gemini multimodal engine
                </p>
              </div>
            )}

            {isRecording && (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-900/60 rounded-xl border border-red-500/20">
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center recording-pulse scale-105 mb-3"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
                <p className="text-xs font-bold text-red-400 font-mono animate-pulse flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Recording Spoken Question: {formatTime(recordingTime)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click square button above to stop recording
                </p>
              </div>
            )}

            {audioBlob && !isRecording && (
              <div className="bg-slate-900/90 rounded-xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-slate-300 font-mono">
                    <Volume2 className="w-4 h-4 text-blue-400" />
                    <span>Recorded Spoken Question ({formatTime(recordingTime)})</span>
                  </div>

                  <button
                    onClick={resetRecording}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Re-record"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {audioUrl && (
                  <audio src={audioUrl} controls className="w-full h-8 accent-blue-500" />
                )}

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    onClick={resetRecording}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                  >
                    Discard
                  </button>

                  <button
                    onClick={submitVoiceQuery}
                    className="px-4 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Execute Voice RAG Query
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
