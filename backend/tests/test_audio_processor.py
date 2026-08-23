import pytest
import numpy as np
from app.services.audio_processor import audio_processor

def test_validate_file_valid():
    assert audio_processor.validate_file("lecture.mp3", 1024 * 1024) is True
    assert audio_processor.validate_file("speech.wav", 500 * 1024) is True
    assert audio_processor.validate_file("audio.flac", 2 * 1024 * 1024) is True

def test_validate_file_invalid_extension():
    with pytest.raises(ValueError, match="Unsupported audio format"):
        audio_processor.validate_file("document.pdf", 1024)

def test_validate_file_size_exceeded():
    with pytest.raises(ValueError, match="exceeds maximum limit"):
        audio_processor.validate_file("huge.wav", 150 * 1024 * 1024)

def test_chunk_audio_timing():
    sr = 16000
    duration_seconds = 70  # 70 seconds audio
    samples = np.zeros(sr * duration_seconds, dtype=np.float32)
    
    # 30s chunk duration, 5s overlap => step = 25s
    # Chunks: 0-30s, 25-55s, 50-70s
    chunks = audio_processor.chunk_audio(
        audio_data=samples,
        sr=sr,
        audio_file_id="test_lecture",
        chunk_duration=30,
        chunk_overlap=5
    )
    
    assert len(chunks) == 3
    assert chunks[0]["start_time"] == 0.0
    assert chunks[0]["end_time"] == 30.0
    
    assert chunks[1]["start_time"] == 25.0
    assert chunks[1]["end_time"] == 55.0
    
    assert chunks[2]["start_time"] == 50.0
    assert chunks[2]["end_time"] == 70.0
