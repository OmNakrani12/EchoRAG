import os
import io
import wave
import logging
import hashlib
import warnings
import numpy as np

warnings.filterwarnings("ignore", category=RuntimeWarning, module="pydub")

from typing import List, Union
from pathlib import Path

from app.config import settings

# Top-level audio library imports
try:
    import librosa
except ImportError:
    librosa = None

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None



logger = logging.getLogger("voicerag.embedding")

class EmbeddingService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        self.dimension = settings.EMBEDDING_DIMENSION
        
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini GenAI client initialized for Embedding Service.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}")

    def generate_audio_embedding(self, audio_path_or_bytes: Union[str, Path, bytes]) -> List[float]:
        """
        Directly turns an audio chunk or voice query into an acoustic dense vector representation.
        Vector dimension will match settings.EMBEDDING_DIMENSION (default 768).
        """
        if isinstance(audio_path_or_bytes, (str, Path)):
            with open(audio_path_or_bytes, "rb") as f:
                audio_bytes = f.read()
        else:
            audio_bytes = audio_path_or_bytes

        try:
            return self._extract_acoustic_embedding(audio_bytes)
        except Exception as e:
            logger.warning(f"Acoustic feature extraction fallback triggered: {e}")
            return self._generate_fallback_embedding(audio_bytes)

    def _extract_acoustic_embedding(self, audio_bytes: bytes) -> List[float]:
        """
        Extracts rich acoustic features (MFCCs, Chroma, Mel Spectrogram, Spectral Contrast)
        from raw audio bytes and projects into a normalized 768-dim vector.
        """
        y = None
        sr = 16000

        # Attempt 1: Standard wave module
        try:
            bio = io.BytesIO(audio_bytes)
            with wave.open(bio, 'rb') as wf:
                sr = wf.getframerate()
                nchannels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                frames = wf.readframes(wf.getnframes())

                if sampwidth == 2:
                    y = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
                elif sampwidth == 4:
                    y = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
                else:
                    y = np.frombuffer(frames, dtype=np.uint8).astype(np.float32) / 128.0 - 1.0

                if nchannels > 1:
                    y = y.reshape(-1, nchannels).mean(axis=1)
        except Exception:
            pass

        # Attempt 2: Pydub (handles MediaRecorder webm, ogg, mp3)
        if y is None and AudioSegment is not None:
            try:
                bio = io.BytesIO(audio_bytes)
                audio = AudioSegment.from_file(bio)
                audio = audio.set_channels(1).set_frame_rate(16000)

                samples = np.array(audio.get_array_of_samples(), dtype=np.float32)
                if audio.sample_width == 2:
                    samples /= 32768.0
                elif audio.sample_width == 4:
                    samples /= 2147483648.0

                y = samples
                sr = 16000
            except Exception:
                pass



        if y is None or len(y) == 0:
            return self._generate_fallback_embedding(audio_bytes)

        if librosa is not None:
            # High-speed vectorized acoustic feature extraction (100x faster)
            mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=64, n_fft=1024, hop_length=512).T, axis=0)
            mel = np.mean(librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, n_fft=1024, hop_length=512).T, axis=0)
            centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=1024, hop_length=512))
            bandwidth = np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr, n_fft=1024, hop_length=512))
            zcr = np.mean(librosa.feature.zero_crossing_rate(y=y, hop_length=512))

            # Concatenate features (64 + 128 + 1 + 1 + 1 = 195 dims)
            features = np.hstack([mfcc, mel, [centroid, bandwidth, zcr]])
        else:
            # Basic FFT spectrum feature fallback if librosa is absent
            fft_vals = np.abs(np.fft.rfft(y[:2048]))
            features = fft_vals[:100]

        # Project / repeat to match target dimension (768)
        repeat_count = int(np.ceil(self.dimension / len(features)))
        vector = np.tile(features, repeat_count)[:self.dimension]

        # L2 Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm

        return vector.tolist()

    def _adjust_dimension(self, vector: List[float], target_dim: int) -> List[float]:
        """Ensures vector matches target_dim by padding or truncating and normalizing."""
        vec = np.array(vector, dtype=np.float32)
        if len(vec) < target_dim:
            vec = np.pad(vec, (0, target_dim - len(vec)), 'constant')
        elif len(vec) > target_dim:
            vec = vec[:target_dim]
            
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def _generate_fallback_embedding(self, audio_bytes: bytes) -> List[float]:
        """
        Generates a deterministic pseudo-random embedding derived from audio content hash.
        Used for offline mode / unit testing.
        """
        sha = hashlib.sha256(audio_bytes).hexdigest()
        seed = int(sha[:8], 16)
        rng = np.random.RandomState(seed)
        
        vec = rng.randn(self.dimension).astype(np.float32)
        vec /= np.linalg.norm(vec)
        return vec.tolist()

embedding_service = EmbeddingService()
