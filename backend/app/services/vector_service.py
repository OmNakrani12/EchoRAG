import logging
import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from app.config import settings

logger = logging.getLogger("voicerag.vector")

class VectorService:
    def __init__(self):
        self.collection_name = settings.QDRANT_COLLECTION
        self.vector_size = settings.EMBEDDING_DIMENSION
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initializes Qdrant client, falling back to :memory: if remote connection fails."""
        try:
            if settings.QDRANT_URL:
                self.client = QdrantClient(
                    url=settings.QDRANT_URL,
                    api_key=settings.QDRANT_API_KEY,
                    timeout=5.0
                )
                # Test connection
                self.client.get_collections()
                logger.info(f"Connected to Qdrant at {settings.QDRANT_URL}")
        except Exception as e:
            logger.warning(f"Could not connect to Qdrant server at {settings.QDRANT_URL}: {e}. Falling back to in-memory Qdrant.")
            self.client = QdrantClient(":memory:")

        self.ensure_collection()

    def ensure_collection(self):
        """Creates Qdrant vector collection if it doesn't already exist."""
        try:
            collections = self.client.get_collections().collections
            existing_names = [c.name for c in collections]
            
            if self.collection_name not in existing_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=qmodels.VectorParams(
                        size=self.vector_size,
                        distance=qmodels.Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection '{self.collection_name}' with size {self.vector_size} (Cosine).")

            # Create payload index on audio_file_id for filtered search
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="audio_file_id",
                    field_schema=qmodels.PayloadSchemaType.KEYWORD
                )
                logger.info("Ensured payload index on 'audio_file_id'.")
            except Exception:
                pass

        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection: {e}")

    def upsert_chunk_vectors(self, chunks_with_embeddings: List[Dict[str, Any]]) -> bool:
        """
        Inserts or updates vector points into Qdrant.
        Each chunk item should contain 'vector' (List[float]) and 'metadata' (Dict).
        """
        points = []
        for item in chunks_with_embeddings:
            meta = item["metadata"]
            vector = item["vector"]
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, meta["chunk_id"]))
            
            points.append(
                qmodels.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=meta
                )
            )

        if points:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            logger.info(f"Upserted {len(points)} vectors into Qdrant collection '{self.collection_name}'.")
            return True
        return False

    def _execute_search(self, query_vector: List[float], k: int, query_filter: Any) -> List[Dict[str, Any]]:
        results = []
        if hasattr(self.client, "query_points"):
            response = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=k,
                query_filter=query_filter
            )
            points = getattr(response, "points", response)
            for hit in points:
                payload = (hit.payload or {}).copy()
                payload["score"] = float(hit.score)
                results.append(payload)
        elif hasattr(self.client, "search"):
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=k,
                query_filter=query_filter
            )
            for hit in search_result:
                payload = (hit.payload or {}).copy()
                payload["score"] = float(hit.score)
                results.append(payload)
        elif hasattr(self.client, "search_points"):
            search_result = self.client.search_points(
                collection_name=self.collection_name,
                vector=query_vector,
                limit=k,
                filter=query_filter
            )
            points = getattr(search_result, "points", search_result)
            for hit in points:
                payload = (hit.payload or {}).copy()
                payload["score"] = float(hit.score)
                results.append(payload)
        return results

    def search_similar_chunks(
        self,
        query_vector: List[float],
        top_k: int = None,
        audio_file_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs vector similarity search in Qdrant.
        Optional filtering by audio_file_id.
        Returns list of payload dicts enriched with 'score'.
        """
        k = top_k or settings.TOP_K
        query_filter = None
        
        if audio_file_id:
            query_filter = qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="audio_file_id",
                        match=qmodels.MatchValue(value=audio_file_id)
                    )
                ]
            )

        try:
            return self._execute_search(query_vector, k, query_filter)
        except Exception as e:
            logger.warning(f"Filtered search failed ({e}). Retrying un-filtered search...")
            try:
                return self._execute_search(query_vector, k, query_filter=None)
            except Exception as ex2:
                logger.error(f"Error performing Qdrant similarity search: {ex2}", exc_info=True)
                return []

vector_service = VectorService()
