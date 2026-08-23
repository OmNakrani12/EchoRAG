import os
import uuid
import math
import io
import wave
import warnings
from pathlib import Path
from typing import List, Dict, Tuple, Any
import numpy as np

warnings.filterwarnings("ignore", category=RuntimeWarning, module="pydub")

from app.config import settings
from app.services.storage_service import storage_service

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".flac", ".ogg"}
MAX_FILE_SIZE_MB = 100

class AudioProcessor:
    def __init__(self, target_sr: int = 16000):
        self.target_sr = target_sr

    def validate_file(self, filename: str, file_size_bytes: int) -> bool:
        """
        Validates file extension and size.
        """
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"Unsupported audio format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
        
        if file_size_bytes > MAX_FILE_SIZE_MB * 1024 * 1024:
            raise ValueError(f"File size exceeds maximum limit of {MAX_FILE_SIZE_MB}MB.")
            
        return True

    def load_and_normalize(self, input_file_path: Path) -> Tuple[np.ndarray, int, float]:
        """
        Reads audio file, converts to mono and target sampling rate (16kHz), returns (samples, sample_rate, duration_seconds).
        Falls back through standard wave, pydub, soundfile, or librosa depending on format.
        """
        # Attempt 1: Standard wave module (zero C-library DLL dependencies)
        try:
            with wave.open(str(input_file_path), 'rb') as wf:
                sr = wf.getframerate()
                nchannels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                nframes = wf.getnframes()
                frames = wf.readframes(nframes)

                if sampwidth == 2:
                    data = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                elif sampwidth == 4:
                    data = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
                else:
                    data = np.frombuffer(frames, dtype=np.uint8).astype(np.float32) / 128.0 - 1.0

                if nchannels > 1:
                    data = data.reshape(-1, nchannels).mean(axis=1)

                if sr != self.target_sr:
                    import librosa
                    data = librosa.resample(data, orig_sr=sr, target_sr=self.target_sr)
                    sr = self.target_sr

                duration = float(len(data)) / float(sr)
                return data, sr, duration
        except Exception:
            pass

        # Attempt 2: Librosa load (native decoder for MP3, M4A, FLAC, OGG, WAV)
        try:
            import librosa
            data, sr = librosa.load(str(input_file_path), sr=self.target_sr, mono=True)
            duration = float(len(data)) / float(sr)
            return data, sr, duration
        except Exception:
            pass

        # Attempt 3: Pydub AudioSegment
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(str(input_file_path))
            audio = audio.set_channels(1).set_frame_rate(self.target_sr)
            
            samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
            if audio.sample_width == 2:
                samples /= 32768.0
            elif audio.sample_width == 4:
                samples /= 2147483648.0
            
            duration = float(len(samples)) / float(self.target_sr)
            return samples, self.target_sr, duration
        except Exception:
            pass

        raise ValueError(f"Could not load audio file '{input_file_path.name}'. Supported formats: WAV, MP3, M4A, FLAC, OGG.")

    def save_wav_samples(self, target_path: Path, samples: np.ndarray, sr: int = 16000):
        """
        Saves 16kHz mono float samples into a clean WAV file using standard wave module.
        """
        int_samples = (np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16)
        with wave.open(str(target_path), 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(int_samples.tobytes())

    def chunk_audio(
        self,
        audio_data: np.ndarray,
        sr: int,
        audio_file_id: str,
        chunk_duration: int = None,
        chunk_overlap: int = None
    ) -> List[Dict[str, Any]]:
        """
        Splits audio data into chunks with specified duration and overlap (in seconds).
        Saves each chunk as a WAV file via storage_service.
        """
        c_duration = chunk_duration or settings.CHUNK_DURATION
        c_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        step = c_duration - c_overlap

        total_samples = len(audio_data)
        total_seconds = total_samples / sr
        
        chunks = []
        chunk_index = 0
        start_sec = 0.0

        if total_seconds == 0:
            return []

        while start_sec < total_seconds:
            end_sec = min(start_sec + c_duration, total_seconds)
            
            start_sample = int(start_sec * sr)
            end_sample = int(end_sec * sr)
            
            chunk_samples = audio_data[start_sample:end_sample]
            
            if len(chunk_samples) > 0:
                chunk_id = f"{audio_file_id}_chunk_{chunk_index:03d}"
                chunk_filename = f"{chunk_id}.wav"
                
                # Save temp wav file using pure Python wave module
                temp_chunk_path = storage_service.base_path / "chunks" / f"temp_{chunk_filename}"
                self.save_wav_samples(temp_chunk_path, chunk_samples, sr)
                
                # Move to storage service
                with open(temp_chunk_path, "rb") as f:
                    storage_url = storage_service.save_file(f.read(), chunk_filename, subfolder="chunks")
                
                if temp_chunk_path.exists():
                    temp_chunk_path.unlink()

                chunk_meta = {
                    "chunk_id": chunk_id,
                    "audio_file_id": audio_file_id,
                    "start_time": round(start_sec, 2),
                    "end_time": round(end_sec, 2),
                    "audio_path": storage_url,
                    "embedding_model": settings.EMBEDDING_MODEL,
                    "speaker_id": "speaker_0"
                }
                chunks.append(chunk_meta)

            chunk_index += 1
            start_sec += step

            if end_sec >= total_seconds:
                break

        return chunks

audio_processor = AudioProcessor()
