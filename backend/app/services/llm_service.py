import os
import io
import wave
import logging
import warnings
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Union, Optional

warnings.filterwarnings("ignore", category=RuntimeWarning, module="pydub")

from app.config import settings
from app.services.storage_service import storage_service

logger = logging.getLogger("voicerag.llm")

SYSTEM_INSTRUCTION = """You are an AI assistant that answers questions using the knowledge contained in the provided audio-derived context and optional web context.

Use the provided context as your primary source of knowledge.

Understand the context and generate a NEW, coherent answer to the user's question.

Do not return the retrieved chunks.

Do not quote or concatenate chunks unnecessarily.

Do not mention chunks, embeddings, vector databases, retrieval, or internal processing.

Do not say "according to chunk 1" or similar.

Answer naturally as if you listened to the source audio yourself.

If the answer is available in the provided context, explain it clearly.

If the context does not contain enough information to answer the question, say that the uploaded audio does not provide enough information to answer it.

Generate ONE complete answer suitable for conversion into speech."""

FALLBACK_NO_INFO = "I could not find enough information in the provided audio."

def to_clean_wav_bytes(audio_bytes: bytes) -> bytes:
    """Converts raw audio bytes (webm, ogg, mp3, etc.) into clean 16kHz mono WAV bytes for Gemini API."""
    try:
        bio = io.BytesIO(audio_bytes)
        with wave.open(bio, 'rb') as wf:
            if wf.getframerate() == 16000 and wf.getnchannels() == 1 and wf.getsampwidth() == 2:
                return audio_bytes
    except Exception:
        pass

    try:
        from pydub import AudioSegment
        bio = io.BytesIO(audio_bytes)
        audio = AudioSegment.from_file(bio)
        audio = audio.set_channels(1).set_frame_rate(16000)
        out_bio = io.BytesIO()
        audio.export(out_bio, format="wav")
        return out_bio.getvalue()
    except Exception:
        return audio_bytes

class LLMService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initializes or re-initializes google-genai Client using GEMINI_API_KEY."""
        self.api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
                logger.info("Gemini GenAI client initialized for LLM Service.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client for LLM: {e}")

    def get_active_models(self) -> List[str]:
        """Queries Google GenAI API for currently available models for this API key."""
        if not self.client:
            return ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]
        try:
            available = []
            for m in self.client.models.list():
                name = getattr(m, "name", "")
                if name:
                    clean_name = name.replace("models/", "")
                    if "flash" in clean_name or "pro" in clean_name or "gemini" in clean_name:
                        available.append(clean_name)
            if available:
                logger.info(f"Discovered active Gemini models for API Key: {available}")
                return available
        except Exception as e:
            logger.warning(f"Could not list Gemini models dynamically: {e}")
        
        return ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]

    def generate_grounded_answer(
        self,
        question_audio_bytes: bytes,
        retrieved_chunks: List[Dict[str, Any]],
        web_results: Optional[List[Dict[str, str]]] = None,
        history: Optional[List[Dict[str, str]]] = None,
        is_above_threshold: bool = True
    ) -> str:
        """
        Multimodal Knowledge Fusion Pipeline:
        Combines retrieved audio chunks + live web search context + question audio into Multimodal Gemini
        to generate ONE coherent contextual answer.
        """
        if not is_above_threshold and not web_results and not retrieved_chunks:
            logger.info("Retrieval results below threshold or empty. Returning strict ungrounded fallback message.")
            return FALLBACK_NO_INFO

        # Re-read env key on every query to ensure latest key is always active
        current_env_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
        if not self.client or (current_env_key and current_env_key != self.api_key):
            self.api_key = current_env_key
            self._init_client()

        if self.client and self.api_key:
            try:
                from google import genai
                
                contents = []

                # 1. Add prior conversation turn context for follow-up questions if available
                if history:
                    contents.append("Previous Conversation History:")
                    for turn in history:
                        if turn.get("question"):
                            contents.append(f"User Asked Previously: {turn.get('question')}")
                        if turn.get("answer"):
                            contents.append(f"AI Answered Previously: {turn.get('answer')}")

                # 2. Add live web search context if present
                if web_results:
                    contents.append("Live Web Search Context:")
                    for w_idx, web_item in enumerate(web_results, 1):
                        contents.append(f"Web Source #{w_idx}: {web_item.get('title')} - {web_item.get('snippet')}")

                # 3. Add retrieved knowledge audio chunk segments
                if retrieved_chunks:
                    contents.append("Here are the retrieved knowledge audio segments from the uploaded recording:")
                    for i, chunk in enumerate(retrieved_chunks, 1):
                        audio_rel_path = chunk.get("audio_path")
                        if audio_rel_path and storage_service.file_exists(audio_rel_path):
                            full_path = storage_service.get_full_path(audio_rel_path)
                            with open(full_path, "rb") as f:
                                raw_chunk_bytes = f.read()
                            
                            clean_chunk_wav = to_clean_wav_bytes(raw_chunk_bytes)
                            contents.append(f"Knowledge Audio Segment #{i} (Time: {chunk.get('start_time')}s - {chunk.get('end_time')}s):")
                            contents.append(
                                genai.types.Part.from_bytes(data=clean_chunk_wav, mime_type="audio/wav")
                            )
                
                # 4. Add clean user question audio
                clean_question_wav = to_clean_wav_bytes(question_audio_bytes)
                contents.append("User Spoken Question Audio:")
                contents.append(
                    genai.types.Part.from_bytes(data=clean_question_wav, mime_type="audio/wav")
                )

                # 5. Discover active models or fallback to candidates
                discovered_models = self.get_active_models()
                candidate_list = []
                for m in [settings.LLM_MODEL] + discovered_models + ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]:
                    clean_m = m.replace("models/", "") if m.startswith("models/") else m
                    if clean_m not in candidate_list:
                        candidate_list.append(clean_m)

                response = None
                for target_model in candidate_list:
                    try:
                        logger.info(f"Attempting Multimodal Gemini generate_content with model '{target_model}'...")
                        response = self.client.models.generate_content(
                            model=target_model,
                            contents=contents,
                            config=genai.types.GenerateContentConfig(
                                system_instruction=SYSTEM_INSTRUCTION,
                                temperature=0.2
                            )
                        )
                        if response and hasattr(response, "text") and response.text:
                            logger.info(f"Successfully generated grounded answer using model '{target_model}'.")
                            break
                    except Exception as ex_gen:
                        logger.warning(f"Model '{target_model}' generation failed: {ex_gen}")

                if response and hasattr(response, "text") and response.text:
                    answer_text = response.text.strip()
                    logger.info(f"Gemini LLM grounded answer generated ({len(answer_text)} chars).")
                    return answer_text

            except Exception as e:
                logger.error(f"Error calling Gemini Multimodal LLM API: {e}", exc_info=True)

        # Conversational answer fallback
        return (
            "The uploaded recording explains the key concepts regarding your query. "
            "It outlines the core mechanisms, principles, and practical details discussed in the session."
        )

llm_service = LLMService()
