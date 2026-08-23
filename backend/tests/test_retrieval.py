import pytest
from app.services.retrieval_service import retrieval_service
from app.services.vector_service import vector_service

def test_similarity_threshold_filtering(monkeypatch):
    # Mock vector search returning a low score below threshold
    def mock_search_similar_chunks(*args, **kwargs):
        return [{
            "chunk_id": "chunk_001",
            "audio_file_id": "lecture_1",
            "start_time": 0.0,
            "end_time": 30.0,
            "score": 0.15  # Low score < 0.35 threshold
        }]

    monkeypatch.setattr(vector_service, "search_similar_chunks", mock_search_similar_chunks)

    # Dummy 1-second silence bytes
    dummy_audio_bytes = b"\x00" * 32000

    res = retrieval_service.retrieve_relevant_audio(
        question_audio_data=dummy_audio_bytes,
        similarity_threshold=0.35
    )

    assert res["is_above_threshold"] is False
    assert len(res["retrieved_chunks"]) == 0
    assert res["max_score"] == 0.15

def test_similarity_above_threshold(monkeypatch):
    def mock_search_high(*args, **kwargs):
        return [{
            "chunk_id": "chunk_003",
            "audio_file_id": "lecture_1",
            "start_time": 60.0,
            "end_time": 90.0,
            "score": 0.88  # High score > 0.35 threshold
        }]

    monkeypatch.setattr(vector_service, "search_similar_chunks", mock_search_high)

    dummy_audio_bytes = b"\x00" * 32000

    res = retrieval_service.retrieve_relevant_audio(
        question_audio_data=dummy_audio_bytes,
        similarity_threshold=0.35
    )

    assert res["is_above_threshold"] is True
    assert len(res["retrieved_chunks"]) == 1
    assert res["retrieved_chunks"][0]["chunk_id"] == "chunk_003"
    assert res["max_score"] == 0.88
