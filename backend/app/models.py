import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base

class AudioFile(Base):
    __tablename__ = "audio_files"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, default="default_user", index=True)
    filename = Column(String, nullable=False)
    duration = Column(Float, nullable=False)
    storage_url = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    chunks = relationship("AudioChunk", back_populates="audio_file", cascade="all, delete-orphan")

class AudioChunk(Base):
    __tablename__ = "audio_chunks"

    id = Column(String, primary_key=True, index=True)
    audio_file_id = Column(String, ForeignKey("audio_files.id"), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    storage_url = Column(String, nullable=False)
    speaker_id = Column(String, nullable=True)

    audio_file = relationship("AudioFile", back_populates="chunks")
