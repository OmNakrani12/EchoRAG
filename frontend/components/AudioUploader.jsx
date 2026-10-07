'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, CheckCircle2, AlertCircle, Loader2, Sparkles, Folder, HardDrive, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

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
      const steps = [
        'Uploading audio stream to Firebase Storage...',
        'Normalizing audio to 16kHz mono WAV format...',
        'Creating overlapping 30s audio chunks...',
        'Extracting Gemini 768-dim acoustic vectors...',
        'Upserting audio vectors into Qdrant index...'
      ];

      let stepIndex = 0;
      const interval = setInterval(() => {
        if (stepIndex < steps.length) {
          setProgressStep(steps[stepIndex]);
          stepIndex++;
        }
      }, 1200);

      const response = await fetch(`${API_BASE_URL}/api/audio/upload`, {
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
    <div className="firebase-card relative overflow-hidden">
      {/* Firebase Header Strip */}
      <div className="firebase-card-header flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Firebase Storage Bucket
            </h3>
            <p className="text-[11px] text-slate-400">
              gs://echorag-audio-bucket/originals
            </p>
          </div>
        </div>

        {activeFile ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {activeFile.total_chunks} Vectors Indexed
          </span>
        ) : (
          <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            Bucket Status: Ready
          </span>
        )}
      </div>

      <div className="p-5">
        {!activeFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
                : 'border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]'
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
                <Loader2 className="w-9 h-9 text-blue-400 animate-spin" />
                <p className="text-xs font-semibold text-blue-300 font-mono">{progressStep}</p>
                <p className="text-[11px] text-slate-500">Pipeline: Local WAV -&gt; Gemini Embedding -&gt; Qdrant DB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    <span className="text-blue-400">Click to upload file</span> or drag & drop knowledge recording
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Accepts MP3, WAV, M4A, FLAC, OGG (Max size: 100MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/90 rounded-lg p-4 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md font-mono">
                  {activeFile.filename}
                </p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-0.5">
                  <span>Duration: {activeFile.duration || '--'}s</span>
                  <span>•</span>
                  <span>Chunks: {activeFile.total_chunks}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">Qdrant Active</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              Upload Different File
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
    </div>
  );
}

