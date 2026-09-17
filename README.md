# 🎙️ EchoRAG — Native Multimodal Audio RAG

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Frontend: Next.js 14](https://img.shields.io/badge/Frontend-Next.js%2014%20(JavaScript)-black)](https://nextjs.org/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-FastAPI%20(Python%203.10+)-009688)](https://fastapi.tiangolo.com/)
[![Vector DB: Qdrant](https://img.shields.io/badge/Vector%20DB-Qdrant-red)](https://qdrant.tech/)
[![AI: Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20Multimodal-4285F4)](https://ai.google.dev/)

**EchoRAG** is a production-grade, end-to-end AI application built for **Native Multimodal Audio Retrieval-Augmented Generation**. 

Unlike conventional audio QA systems that rely on intermediate text transcriptions (`Audio → ASR → Text → Vector Search`), EchoRAG bypasses text transcripts during retrieval. It operates directly on raw acoustic audio embeddings, dense vector search, and multimodal LLMs:
$$\text{Audio File} \xrightarrow{\text{Chunking}} \text{Audio Vector} \xrightarrow{\text{Qdrant Similarity Search}} \text{Top-K Audio Chunks} \xrightarrow{\text{Gemini Multimodal LLM}} \text{Spoken Answer}$$

---

## 🏛️ Comprehensive Project Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (Next.js 14 + React 18)                     │
│  ┌───────────────────────┐   ┌───────────────────────────┐   ┌────────────────┐ │
│  │ AudioUploader.jsx     │   │ VoiceRecorder.jsx         │   │ AnswerDisplay  │ │
│  │ (Drag & Drop MP3/WAV) │   │ (Browser MediaRecorder)   │   │ & TTS Player   │ │
│  └───────────┬───────────┘   └─────────────┬─────────────┘   └───────▲────────┘ │
└──────────────┼─────────────────────────────┼─────────────────────────┼──────────┘
               │ HTTP POST /upload           │ HTTP POST /query        │ Streams Audio
               ▼                             ▼                         │
┌──────────────────────────────────────────────────────────────────────┴───────────┐
│                             BACKEND (FastAPI + Python 3.10+)                     │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │ API Gateway & Router Layer (app/api/routes.py)                             │  │
│  └───────────┬─────────────────────────────┬──────────────────────────────────┘  │
│              │                             │                                     │
│              ▼                             ▼                                     │
│  ┌───────────────────────┐   ┌───────────────────────────┐                       │
│  │ Audio Processor       │   │ Query Planner Service     │                       │
│  │ (librosa, pydub, wave)│   │ (audio vs web strategy)   │                       │
│  └───────────┬───────────┘   └─────────────┬─────────────┘                       │
│              │                             │                                     │
│              ▼                             ▼                                     │
│  ┌───────────────────────┐   ┌───────────────────────────┐   ┌────────────────┐  │
│  │ Embedding Service     │   │ Retrieval Service         │   │ Web Search     │  │
│  │ (Acoustic 768-dim)    │   │ (Cosine similarity score) │   │ (DuckDuckGo)   │  │
│  └───────────┬───────────┘   └─────────────┬─────────────┘   └───────┬────────┘  │
│              │                             │                         │           │
│              ▼                             ▼                         │           │
│  ┌───────────────────────────────────────────────────────┐           │           │
│  │ Multimodal Gemini LLM Service (google-genai SDK)      │◄──────────┘           │
│  └───────────┬───────────────────────────────────────────┘                       │
│              │ Text Answer                                                       │
│              ▼                                                                   │
│  ┌───────────────────────┐   ┌───────────────────────────┐                       │
│  │ TTS Service (gTTS)    │   │ Storage Service & DB      │                       │
│  │ (Audio Synthesis)     │   │ (SQLite / File System)    │                       │
│  └───────────────────────┘   └───────────────────────────┘                       │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES & VECTOR DB                         │
│  ┌──────────────────────────────────┐      ┌──────────────────────────────────┐  │
│  │ Qdrant Vector Engine             │      │ Google Gemini API                │  │
│  │ (768-dim Cosine Vector Search)   │      │ (Gemini 2.5 / 1.5 Multimodal)    │  │
│  └──────────────────────────────────┘      └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Libraries & Framework Usage Map

Below is a detailed index of **which library is used, where it is located, and why it was selected**:

### 1. Backend Libraries (Python Stack)

| Library / Package | Location in Project | Primary Purpose & Usage |
| :--- | :--- | :--- |
| **`fastapi`** | `backend/app/main.py`, `backend/app/api/routes.py` | High-performance asynchronous REST API web framework powering all endpoints (`/upload`, `/query`, streaming). |
| **`uvicorn`** | `backend/run.py`, `backend/Dockerfile` | Lightning-fast ASGI web server running the FastAPI application instance. |
| **`google-genai`** | `backend/app/services/llm_service.py`, `embedding_service.py` | Official Google GenAI SDK interfacing directly with Gemini Multimodal models for grounded reasoning and feature vectors. |
| **`qdrant-client`** | `backend/app/services/vector_service.py` | Python client for Qdrant Vector DB, managing 768-dim vector payload indexing, filtering, and Cosine similarity search. |
| **`librosa`** | `backend/app/services/audio_processor.py`, `embedding_service.py` | Music and audio analysis library used to compute MFCCs, Chroma STFT, Mel Spectrograms, Spectral Contrast, and sample rate conversion (16kHz). |
| **`pydub`** | `backend/app/services/audio_processor.py`, `llm_service.py` | Audio manipulation library decoding incoming audio formats (`WebM`, `OGG`, `MP3`, `FLAC`, `M4A`) into standardized PCM WAV streams. |
| **`wave` & `soundfile`** | `backend/app/services/audio_processor.py` | Standard library audio modules used to write clean, zero-dependency 16kHz mono WAV chunk files. |
| **`numpy`** | `backend/app/services/audio_processor.py`, `embedding_service.py` | High-speed array manipulation, L2 vector normalization, feature matrix concatenation, and float-to-int PCM quantization. |
| **`sqlalchemy`** | `backend/app/db.py`, `backend/app/models.py` | SQL ORM for session, file metadata, and chunk index tracking with SQLite/PostgreSQL support. |
| **`pydantic` & `pydantic-settings`** | `backend/app/config.py` | Strict data validation and environment variable schema management (`.env` parsing). |
| **`gTTS` (Google Text-to-Speech)** | `backend/app/services/tts_service.py` | Converts text responses generated by Gemini LLM back into playable MP3/WAV voice audio. |
| **`httpx` & `beautifulsoup4`** | `backend/app/services/web_search_service.py` | Asynchronous HTTP client and HTML scraper used by the query planner to fetch live web search results for hybrid questions. |
| **`pytest`** | `backend/tests/` | Automated testing framework verifying chunking logic, threshold evaluations, and API endpoints. |

---

### 2. Frontend Libraries (JavaScript / Next.js Stack)

| Library / Package | Location in Project | Primary Purpose & Usage |
| :--- | :--- | :--- |
| **`Next.js 14`** | `frontend/app/`, `frontend/package.json` | React framework using App Router (`app/page.js`, `app/layout.js`) compiled in standalone output mode for lightweight production. |
| **`React 18`** | `frontend/components/*.jsx` | UI library managing component state (audio streams, recording states, uploaded sources, active playback timestamps). |
| **`tailwindcss`** | `frontend/app/globals.css`, `frontend/tailwind.config.js` | Utility-first CSS framework enabling dark mode glassmorphism UI. |
| **`lucide-react`** | `frontend/components/*.jsx` | Icon suite providing UI iconography for audio controls (`Mic`, `Upload`, `Play`, `Pause`, `Volume`, `FileAudio`). |
| **Browser `MediaRecorder` API** | `frontend/components/VoiceRecorder.jsx` | Native web browser API capturing live user microphone input in real time. |

---

## ⚙️ Core Service Layer Breakdown (`backend/app/services/`)

The backend is modularized into specialized service components:

```text
backend/app/services/
├── audio_processor.py      # Resampling (16kHz), mono conversion & 30s overlapping chunker
├── embedding_service.py    # Extracts acoustic dense vectors (768-dim L2 normalized)
├── vector_service.py       # Interfacing with Qdrant collection (Cosine metric & metadata payload)
├── retrieval_service.py    # Query vector search execution & similarity score filtering
├── query_planner_service.py# Query intent router (audio-only vs web vs hybrid comparison)
├── web_search_service.py   # Live web fallback search scraper via DuckDuckGo & httpx
├── llm_service.py          # Multimodal Gemini fusion model (audio chunks + web context + query audio)
├── tts_service.py          # Speech synthesis engine producing spoken answers
└── storage_service.py      # Local file system / Cloud storage abstraction layer
```

---

## 🔄 End-to-End Data Flow

### A. Ingestion Pipeline
1. **User Uploads File**: Knowledge audio (`MP3/WAV/FLAC/OGG/M4A`) uploaded via `AudioUploader.jsx`.
2. **Normalization**: `audio_processor.py` converts audio to **16kHz Mono WAV**.
3. **Sliding Window Chunking**: Audio is divided into 30-second windows with 5-second overlap.
4. **Vector Embedding**: `embedding_service.py` extracts acoustic features (MFCC, Mel Spectrogram, Chroma) into **768-dimensional L2-normalized vectors**.
5. **Index in Qdrant**: `vector_service.py` upserts vectors and metadata into Qdrant.

### B. Query & Retrieval Pipeline
1. **Voice / Text Query**: User asks a question via microphone (`VoiceRecorder.jsx`) or text.
2. **Query Planning**: `query_planner_service.py` evaluates whether the question requires knowledge audio, web search, or both.
3. **Vector Search**: `retrieval_service.py` queries Qdrant to find the top $K$ ($K=5$) matching audio segments.
4. **Multimodal Gemini Reasoning**: `llm_service.py` constructs a multimodal prompt passing:
   - System instruction
   - Prior conversation turn history
   - Live web search snippets (if applicable)
   - Retrieved raw WAV audio chunks
   - Original question audio WAV
5. **Grounded Answer & TTS**: Gemini returns a grounded answer string, which `tts_service.py` converts into spoken audio.

---

## 🛠️ Environment Configuration

Create a `.env` file in the root directory:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Qdrant Vector Database Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=voicerag_audio

# Audio Embedding Configuration (Gemini Embedding 2 dimension)
EMBEDDING_DIMENSION=768

# RAG Retrieval Configuration
TOP_K=5
SIMILARITY_THRESHOLD=0.35

# Storage & Database Configuration
STORAGE_PATH=./storage
DATABASE_URL=sqlite:///./storage/voicerag.db
```

---

## 🚀 Quick Start & Running locally

### 1. Docker Compose (Full Stack)

```bash
docker compose up --build -d
```

### 2. Manual Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
python run.py
```
The FastAPI backend server runs at `http://localhost:8000`.

### 3. Manual Frontend Setup (Next.js)

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 📡 API Reference Table

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/audio/upload` | Ingests knowledge audio file (Chunking + Vector Indexing) |
| `GET` | `/api/audio/{file_id}/status` | Checks audio ingestion progress status |
| `POST` | `/api/query` | Spoken/text question multimodal RAG query |
| `GET` | `/api/audio/{file_id}` | Streams original knowledge audio file |
| `GET` | `/api/audio/chunks/{chunk_id}` | Streams specific retrieved audio chunk WAV file |
| `GET` | `/api/audio/tts/{filename}` | Streams synthesized spoken answer audio |
| `GET` | `/health` | Server health check endpoint |

---

## 📄 License

Distributed under the **MIT License**.
