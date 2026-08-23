'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Send, Loader2, Volume2, AlertCircle } from 'lucide-react';

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

      const response = await fetch('/api/query', {
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
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      <div className="mb-6">
        <h2 className="text-lg font-semibold font-heading text-white flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          Ask a Voice Question
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Record your question using your microphone. The AI will retrieve the relevant knowledge context and respond with ONE continuous speech answer.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center p-6 bg-slate-950/40 rounded-xl border border-slate-800/80">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            disabled={loading}
            className="group relative w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Mic className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="absolute -bottom-7 text-xs font-semibold text-slate-300">
              Click to Record
            </span>
          </button>
        )}

        {isRecording && (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-red-600/20 border-2 border-red-500 flex items-center justify-center text-red-500 recording-active">
                <Mic className="w-10 h-10 animate-pulse" />
              </div>
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                🔴 Recording... {formatTime(recordingTime)}
              </span>
            </div>

            <button
              onClick={stopRecording}
              className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Recording
            </button>
          </div>
        )}

        {audioBlob && !loading && (
          <div className="w-full flex flex-col items-center space-y-4">
            <div className="w-full bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-200">Question Recording Ready</p>
                  <p className="text-[11px] text-slate-400">{formatTime(recordingTime)} Duration</p>
                </div>
              </div>

              {audioUrl && (
                <audio controls src={audioUrl} className="h-8 max-w-[180px] sm:max-w-xs" />
              )}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={resetRecording}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-record
              </button>

              <button
                onClick={submitVoiceQuery}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                <Send className="w-3.5 h-3.5" />
                Ask Voice Question
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="py-6 flex flex-col items-center space-y-3">
            <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
            <p className="text-sm font-medium text-purple-200 animate-pulse">{queryStep}</p>
            <p className="text-xs text-slate-400">Generating ONE complete contextual answer & speech audio</p>
          </div>
        )}
      </div>

      {micError && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{micError}</span>
        </div>
      )}
    </div>
  );
}
