import logging
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

from app.config import settings
from app.services.embedding_service import embedding_service
from app.services.vector_service import vector_service

logger = logging.getLogger("voicerag.retrieval")

class RetrievalService:
    def __init__(self):
        self.threshold = settings.SIMILARITY_THRESHOLD
        self.top_k = settings.TOP_K

    def retrieve_relevant_audio(
        self,
        question_audio_data: Union[str, Path, bytes],
        audio_file_id: Optional[str] = None,
        top_k: Optional[int] = None,
        similarity_threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Native Audio Retrieval Pipeline:
        Question Audio -> Gemini Audio Embedding -> Qdrant Similarity Search -> Top-K Audio Chunks
        """
        k = top_k or self.top_k
        thresh = similarity_threshold if similarity_threshold is not None else self.threshold

        # 1. Turn Question Audio directly into Query Vector
        logger.info("Generating embedding for question audio...")
        query_vector = embedding_service.generate_audio_embedding(question_audio_data)

        # 2. Perform Qdrant Vector Similarity Search
        logger.info(f"Searching Qdrant for top {k} matching audio chunks...")
        raw_results = vector_service.search_similar_chunks(
            query_vector=query_vector,
            top_k=k,
            audio_file_id=audio_file_id
        )

        # 3. Log retrieval results
        max_score = 0.0
        if raw_results:
            max_score = raw_results[0].get("score", 0.0)
            logger.info("Retrieved Audio Chunks:")
            for res in raw_results:
                logger.info(f"  {res.get('chunk_id')} -> Score: {res.get('score'):.4f} (Times: {res.get('start_time')}s - {res.get('end_time')}s)")

        # 4. Check similarity threshold
        is_above_threshold = max_score >= thresh

        if not is_above_threshold:
            logger.warning(f"Top similarity score ({max_score:.4f}) is below threshold ({thresh:.4f}).")
            return {
                "retrieved_chunks": [],
                "all_retrieved": raw_results,
                "max_score": max_score,
                "is_above_threshold": False,
                "threshold": thresh,
                "query_vector": query_vector
            }

        return {
            "retrieved_chunks": raw_results,
            "all_retrieved": raw_results,
            "max_score": max_score,
            "is_above_threshold": True,
            "threshold": thresh,
            "query_vector": query_vector
        }

retrieval_service = RetrievalService()
