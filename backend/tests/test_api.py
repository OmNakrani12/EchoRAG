import pytest
import io
import soundfile as sf
import numpy as np

def create_synthetic_wav_bytes(duration_sec=2.0, sr=16000):
    t = np.linspace(0, duration_sec, int(sr * duration_sec), False)
    signal = 0.5 * np.sin(2 * np.pi * 440 * t)
    bio = io.BytesIO()
    sf.write(bio, signal, sr, format='WAV')
    bio.seek(0)
    return bio.read()

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_audio_upload_flow(client):
    wav_bytes = create_synthetic_wav_bytes(duration_sec=3.0)
    files = {"file": ("test_lecture.wav", wav_bytes, "audio/wav")}
    
    response = client.post("/api/audio/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "file_id" in data
    assert data["status"] == "completed"
    assert data["total_chunks"] >= 1

    file_id = data["file_id"]

    # Check status endpoint
    status_resp = client.get(f"/api/audio/{file_id}/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["file_id"] == file_id

def test_voice_query_flow(client):
    query_wav = create_synthetic_wav_bytes(duration_sec=1.5)
    files = {"question_audio": ("question.wav", query_wav, "audio/wav")}
    
    response = client.post("/api/query", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "audio_url" in data
    assert "sources" in data
