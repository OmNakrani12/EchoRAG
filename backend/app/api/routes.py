import uuid
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AudioFile, AudioChunk
from app.services.audio_processor import audio_processor
from app.services.embedding_service import embedding_service
from app.services.vector_service import vector_service
from app.services.retrieval_service import retrieval_service
from app.services.llm_service import llm_service
from app.services.tts_service import tts_service
from app.services.storage_service import storage_service
from app.services.query_planner_service import query_planner_service
from app.services.web_search_service import web_search_service

logger = logging.getLogger("voicerag.api")
router = APIRouter()

# In-memory storage status tracker
ingestion_status = {}

@router.get("/health")
def health_check():
    return {"status": "ok"}

@router.post("/api/audio/upload")
async def upload_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Ingests knowledge audio recording:
    Receive upload -> Validate -> Save Original -> Normalize -> Chunk -> Embed -> Index Qdrant -> Persist DB
    """
    try:
        content = await file.read()
        filename = file.filename or f"upload_{uuid.uuid4().hex[:6]}.wav"
        
        logger.info(f"[1] Knowledge audio received: {filename} ({len(content)} bytes)")
        
        # 1. Validate
        audio_processor.validate_file(filename, len(content))
        
        file_id = f"audio_{uuid.uuid4().hex[:10]}"
        ingestion_status[file_id] = {
            "file_id": file_id,
            "filename": filename,
            "status": "processing",
            "progress_step": "Storing original file",
            "total_chunks": 0
        }

        # 2. Store original
        original_ext = Path(filename).suffix.lower()
        original_storage_name = f"{file_id}_original{original_ext}"
        original_rel_path = storage_service.save_file(content, original_storage_name, subfolder="originals")
        full_original_path = storage_service.get_full_path(original_rel_path)

        # 3. Read audio metadata & Normalize
        ingestion_status[file_id]["progress_step"] = "Normalizing audio (16kHz mono WAV)"
        audio_data, sr, duration = audio_processor.load_and_normalize(full_original_path)
        logger.info(f"[2] Knowledge audio processed: {duration:.2f}s duration at {sr}Hz")

        # 4. Save normalized working copy
        norm_filename = f"{file_id}_norm.wav"
        norm_rel_path = storage_service.save_file(
            storage_service.get_full_path(original_rel_path).read_bytes(),
            norm_filename,
            subfolder="normalized"
        )

        # 5. Create Chunks
        ingestion_status[file_id]["progress_step"] = "Creating audio chunks (30s window, 5s overlap)"
        chunk_metas = audio_processor.chunk_audio(
            audio_data=audio_data,
            sr=sr,
            audio_file_id=file_id
        )
        logger.info(f"[3] Knowledge chunks created: {len(chunk_metas)} internal RAG chunks")

        # 6. Generate Embeddings & Index Qdrant
        ingestion_status[file_id]["progress_step"] = "Generating Gemini embeddings & indexing in Qdrant"
        chunks_with_embeddings = []
        
        db_chunks = []
        for meta in chunk_metas:
            chunk_audio_path = storage_service.get_full_path(meta["audio_path"])
            vector = embedding_service.generate_audio_embedding(chunk_audio_path)
            
            chunks_with_embeddings.append({
                "metadata": meta,
                "vector": vector
            })

            db_chunks.append(
                AudioChunk(
                    id=meta["chunk_id"],
                    audio_file_id=file_id,
                    start_time=meta["start_time"],
                    end_time=meta["end_time"],
                    storage_url=meta["audio_path"],
                    speaker_id=meta.get("speaker_id", "speaker_0")
                )
            )

        logger.info(f"[4] Embeddings generated: {len(chunks_with_embeddings)} acoustic vectors")

        # Upsert into Qdrant
        vector_service.upsert_chunk_vectors(chunks_with_embeddings)
        logger.info(f"[5] Knowledge indexed in Qdrant collection '{vector_service.collection_name}'")

        # 7. Persist Metadata in DB
        audio_record = AudioFile(
            id=file_id,
            user_id="default_user",
            filename=filename,
            duration=round(duration, 2),
            storage_url=original_rel_path
        )
        db.add(audio_record)
        for dbc in db_chunks:
            db.add(dbc)
        db.commit()

        # 8. Update status
        ingestion_status[file_id] = {
            "file_id": file_id,
            "filename": filename,
            "duration": round(duration, 2),
            "status": "completed",
            "progress_step": "Ready for question answering",
            "total_chunks": len(chunk_metas)
        }

        return ingestion_status[file_id]

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing audio upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")

@router.get("/api/audio/{file_id}/status")
def get_ingestion_status(file_id: str, db: Session = Depends(get_db)):
    """
    Returns current status of audio file ingestion.
    """
    if file_id in ingestion_status:
        return ingestion_status[file_id]

    # Fallback to DB
    audio_file = db.query(AudioFile).filter(AudioFile.id == file_id).first()
    if audio_file:
        total_chunks = db.query(AudioChunk).filter(AudioChunk.audio_file_id == file_id).count()
        return {
            "file_id": audio_file.id,
            "filename": audio_file.filename,
            "duration": audio_file.duration,
            "status": "completed",
            "progress_step": "Ready",
            "total_chunks": total_chunks
        }
    
    raise HTTPException(status_code=404, detail="Audio file ID not found.")

@router.post("/api/query")
async def process_voice_query(
    question_audio: UploadFile = File(...),
    file_id: Optional[str] = Form(None),
    history: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Multisource Grounded Voice RAG Workflow:
    Question Audio -> Speech Understanding & Query Planning -> Vector Search (Audio Context) + Web Search (if needed) -> Multimodal Knowledge Fusion LLM -> ONE Contextual Answer Text -> TTS -> ONE Audio Response
    """
    try:
        q_bytes = await question_audio.read()
        if not q_bytes:
            raise HTTPException(status_code=400, detail="Empty audio query received.")

        logger.info(f"[6] User question audio received ({len(q_bytes)} bytes)")

        # Save query audio file
        query_filename = f"query_{uuid.uuid4().hex[:8]}.wav"
        query_rel_path = storage_service.save_file(q_bytes, query_filename, subfolder="queries")
        query_full_path = storage_service.get_full_path(query_rel_path)

        # Parse optional conversation history
        parsed_history = []
        if history:
            try:
                import json
                parsed_history = json.loads(history)
            except Exception:
                pass

        # 1. Answer Planning & Intent Analysis
        plan = query_planner_service.plan_query(
            question_text="User Spoken Query",
            has_uploaded_audio=bool(file_id and file_id != "undefined")
        )
        logger.info(f"[7] Question understood & planned: audio_required={plan['audio_required']}, web_required={plan['web_required']}")

        # 2. Native Audio Retrieval (if audio_required)
        retrieved_chunks = []
        is_above_threshold = True
        if plan["audio_required"]:
            logger.info("[8] Query embedding generated")
            retrieval_res = retrieval_service.retrieve_relevant_audio(
                question_audio_data=query_full_path,
                audio_file_id=file_id if file_id and file_id != "undefined" else None
            )
            retrieved_chunks = retrieval_res["retrieved_chunks"]
            is_above_threshold = retrieval_res["is_above_threshold"]
            logger.info(f"[9] Relevant audio context retrieved ({len(retrieved_chunks)} internal chunks)")

        # 3. Dynamic Web Search (if web_required)
        web_results = []
        if plan["web_required"]:
            logger.info(f"[9b] Executing live web search for '{plan['search_query']}'")
            web_results = web_search_service.search(plan["search_query"])

        # 4. Knowledge Fusion & Grounded Multimodal LLM Answer Generation
        logger.info("[10] LLM fusing context & generating ONE contextual answer")
        answer_text = llm_service.generate_grounded_answer(
            question_audio_bytes=q_bytes,
            retrieved_chunks=retrieved_chunks,
            web_results=web_results,
            history=parsed_history,
            is_above_threshold=is_above_threshold
        )
        logger.info(f"[11] Final answer generated: '{answer_text[:80]}...'")

        # 5. Speech Synthesis (TTS)
        logger.info("[12] TTS generating speech audio from generated answer text")
        tts_res = tts_service.generate_speech(answer_text)
        logger.info(f"[13] Final audio generated at '{tts_res['audio_url']}'")

        # 6. Format Internal Sources (for optional developer debug drawer)
        sources = []
        for chunk in retrieved_chunks:
            chunk_id = chunk.get("chunk_id")
            sources.append({
                "type": "audio",
                "chunk_id": chunk_id,
                "audio_file_id": chunk.get("audio_file_id"),
                "start_time": chunk.get("start_time"),
                "end_time": chunk.get("end_time"),
                "score": round(chunk.get("score", 0.0), 4),
                "chunk_audio_url": f"/api/audio/chunks/{chunk_id}"
            })

        for web_item in web_results:
            sources.append({
                "type": "web",
                "title": web_item.get("title"),
                "snippet": web_item.get("snippet"),
                "url": web_item.get("url")
            })

        logger.info("[14] Sending ONE audio response to frontend")
        return {
            "success": True,
            "question": "Spoken Voice Query",
            "answer": answer_text,
            "audioUrl": tts_res["audio_url"],
            "audio_url": tts_res["audio_url"],
            "grounding": {
                "audioUsed": len(retrieved_chunks) > 0,
                "webUsed": len(web_results) > 0
            },
            "sources": sources
        }

    except Exception as e:
        logger.error(f"Error processing voice query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Voice query failed: {str(e)}")

@router.get("/api/audio/{file_id}")
def stream_audio_file(file_id: str, db: Session = Depends(get_db)):
    """
    Streams original knowledge audio file.
    """
    audio_file = db.query(AudioFile).filter(AudioFile.id == file_id).first()
    if not audio_file:
        raise HTTPException(status_code=404, detail="Audio file not found.")

    full_path = storage_service.get_full_path(audio_file.storage_url)
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Audio file storage path missing.")

    return FileResponse(path=str(full_path), media_type="audio/mpeg", filename=audio_file.filename)

@router.get("/api/audio/chunks/{chunk_id}")
def stream_chunk_file(chunk_id: str, db: Session = Depends(get_db)):
    """
    Streams specific retrieved audio chunk file.
    """
    chunk = db.query(AudioChunk).filter(AudioChunk.id == chunk_id).first()
    if not chunk:
        # Attempt direct lookup by storage path
        chunk_rel_path = f"chunks/{chunk_id}.wav"
        full_path = storage_service.get_full_path(chunk_rel_path)
    else:
        full_path = storage_service.get_full_path(chunk.storage_url)

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Chunk audio file not found.")

    return FileResponse(path=str(full_path), media_type="audio/wav", filename=f"{chunk_id}.wav")

@router.get("/api/audio/tts/{filename}")
def stream_tts_file(filename: str):
    """
    Streams synthesized TTS answer audio file.
    """
    clean_filename = Path(filename).name
    full_path = storage_service.get_full_path(f"tts/{clean_filename}")
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail="TTS audio file not found.")

    media_type = "audio/mpeg" if clean_filename.endswith(".mp3") else "audio/wav"
    return FileResponse(path=str(full_path), media_type=media_type)
