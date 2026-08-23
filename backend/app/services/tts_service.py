import os
import uuid
import logging
import io
import soundfile as sf
import numpy as np
from pathlib import Path
from typing import Dict, Any

from app.services.storage_service import storage_service

logger = logging.getLogger("voicerag.tts")

class TTSService:
    """
    Isolated speech synthesis service.
    Converts answer text into spoken audio files.
    Isolates speech synthesis behind generate_speech(text) interface for future voice cloning.
    """

    def generate_speech(self, text: str) -> Dict[str, Any]:
        """
        Generates spoken audio from text answer and saves to storage.
        Returns dictionary with storage URL and relative audio path.
        """
        filename = f"tts_{uuid.uuid4().hex[:10]}.mp3"
        
        try:
            from gtts import gTTS
            tts = gTTS(text=text, lang="en", slow=False)
            
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_bytes = fp.read()
            
            storage_url = storage_service.save_file(audio_bytes, filename, subfolder="tts")
            logger.info(f"Generated TTS speech for answer using gTTS ({len(audio_bytes)} bytes).")
            return {
                "audio_url": f"/api/audio/tts/{filename}",
                "audio_path": storage_url
            }
        except Exception as e:
            logger.warning(f"gTTS failed: {e}. Falling back to synthetic tone response.")
            
            # Fallback synthetic audio generation for offline mode
            sr = 16000
            duration = min(max(len(text) * 0.05, 1.5), 5.0)  # estimate duration from text
            t = np.linspace(0, duration, int(sr * duration), False)
            # Create pleasant multi-tone audio signal
            signal = 0.2 * np.sin(2 * np.pi * 440 * t) + 0.1 * np.sin(2 * np.pi * 880 * t)
            
            wav_filename = f"tts_{uuid.uuid4().hex[:10]}.wav"
            temp_path = storage_service.base_path / "tts" / f"temp_{wav_filename}"
            sf.write(str(temp_path), signal, sr, format='WAV')
            
            with open(temp_path, "rb") as f:
                audio_bytes = f.read()
            
            if temp_path.exists():
                temp_path.unlink()

            storage_url = storage_service.save_file(audio_bytes, wav_filename, subfolder="tts")
            return {
                "audio_url": f"/api/audio/tts/{wav_filename}",
                "audio_path": storage_url
            }

tts_service = TTSService()
