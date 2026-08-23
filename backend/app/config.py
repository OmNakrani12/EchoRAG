import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_API_KEY: Optional[str] = os.getenv("QDRANT_API_KEY", None)
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "voicerag_audio")
    
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "768"))
    TOP_K: int = int(os.getenv("TOP_K", "5"))
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "-1.0"))
    
    CHUNK_DURATION: int = 30  # seconds
    CHUNK_OVERLAP: int = 5    # seconds
    
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "./storage")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./storage/voicerag.db")
    
    # Model choices
    EMBEDDING_MODEL: str = "text-embedding-004"
    LLM_MODEL: str = "gemini-1.5-flash"
    
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.example", "../.env", "../.env.example"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
