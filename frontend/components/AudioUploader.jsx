'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export default function AudioUploader({ onAudioUploaded, activeFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUpload(file);
    }
  };

  const processUpload = async (file) => {
    setError(null);
    setLoading(true);
    setProgressStep('Uploading knowledge audio file...');

    const validExtensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setError(`Unsupported file format. Please upload ${validExtensions.join(', ')}`);
      setLoading(false);
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds maximum limit of 100MB.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step simulator for UI feedback
      const steps = [
        'Uploading audio stream to backend...',
        'Normalizing audio to 16kHz mono WAV format...',
        'Splitting recording into overlapping 30s chunks...',
        'Generating Gemini Embedding 2 audio vectors...',
        'Upserting audio vectors into Qdrant collection...'
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        if (stepIndex < steps.length) {
          setProgressStep(steps[stepIndex]);
          stepIndex++;
        }
      }, 1200);

      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        let errMsg = 'Upload failed';
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

      const data = await response.json();
      setLoading(false);
      setProgressStep('');
      onAudioUploaded(data);

    } catch (err) {
      setError(err.message || 'An error occurred during upload.');
      setLoading(false);
      setProgressStep('');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold font-heading text-white flex items-center gap-2">
            <FileAudio className="w-5 h-5 text-indigo-400" />
            Knowledge Audio Repository
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload audio recordings to convert directly into native Qdrant vector embeddings.
          </p>
        </div>

        {activeFile && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready: {activeFile.total_chunks} Vector Chunks
          </span>
        )}
      </div>

      {!activeFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-500/10 scale-[0.99]'
              : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".wav,.mp3,.m4a,.flac,.ogg"
            className="hidden"
          />

          {loading ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-sm font-medium text-indigo-200 animate-pulse">{progressStep}</p>
              <p className="text-xs text-slate-400">Processing native audio embeddings via Gemini 2 & Qdrant</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  <span className="text-indigo-400 font-semibold">Click to upload</span> or drag and drop audio file
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports MP3, WAV, M4A, FLAC, OGG (Up to 100MB)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                {activeFile.filename}
              </p>
              <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5">
                <span>Duration: {activeFile.duration || '--'}s</span>
                <span>•</span>
                <span>Indexed Chunks: {activeFile.total_chunks}</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Qdrant Active</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Upload Different Audio
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".wav,.mp3,.m4a,.flac,.ogg"
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
