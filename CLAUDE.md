# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (FastAPI)
```bash
cd backend
cp .env.example .env        # add GROQ_API_KEY
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
# or use the helper:
./start_backend.sh
```

### Frontend (Next.js)
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# or use the helper:
./start_frontend.sh         # sets API URL automatically
```

### Docker (matches HF Spaces exactly)
```bash
docker build -t resume-ranker .
docker run -p 7860:7860 -e GROQ_API_KEY=gsk_... resume-ranker
```

### Frontend static build (for embedding in FastAPI)
```bash
cd frontend
NEXT_PUBLIC_API_URL="" npm run build   # outputs to frontend/out/
# copy out/ to backend/static/ for FastAPI to serve
```

## Architecture

The system is a single Docker container: Next.js is built as a static export and served by FastAPI at `/`. All API calls from the UI are relative (same-origin) in production.

```
Request → FastAPI (port 7860/8000)
             ├── /api/*        → Python route handlers
             └── /             → Next.js static files (backend/static/)
```

### Backend layout (`backend/`)
- **`main.py`** — App entry point. Registers routers, serves static frontend, clears all DB/ChromaDB data on every startup (session-scoped — no data persists across restarts).
- **`agents/`** — Stateless LLM agents, each a single function:
  - `base_agent.py` — `call_llm(system, user)` / `call_llm_json(system, user)` wrappers for Groq
  - `resume_parser_agent.py` — extracts structured fields from raw resume text
  - `jd_analyzer_agent.py` — parses job descriptions into structured requirements
  - `matching_agent.py` — scores resume vs JD across 4 dimensions; `overall_score = skill*0.40 + exp*0.30 + keyword*0.20 + edu*0.10`
  - `explanation_agent.py` — generates human-readable explanation + resume feedback
  - `ats_agent.py` — section-by-section ATS readability scores + improvement suggestions
  - `orchestrator_agent.py` — chains agents into a streaming pipeline (used by `run_matching_pipeline`)
- **`api/`** — FastAPI routers (`resume_routes`, `job_routes`, `candidate_routes`, `dashboard_routes`)
- **`services/`** — DB CRUD layer consumed by routes
- **`embeddings/embedding_service.py`** — ChromaDB wrapper with `ONNXMiniLM_L6_V2`; downloads 79MB model on first run (cached at `~/.cache/chroma/onnx_models/`)
- **`database/`** — SQLAlchemy models (`Resume`, `Job`, `Match`) + `SessionLocal`

### Frontend layout (`frontend/`)
- **`app/page.tsx`** — Main single-page UI: resume upload + job description → SSE streaming match → animated ranked results with ATS panel
- **`lib/api.ts`** — All API calls. `NEXT_PUBLIC_API_URL` env var sets the base (empty = relative for production)
- **`lib/types.ts`** — Shared TypeScript interfaces

### Key data flow
1. Upload resumes → `POST /api/resumes/upload` → `resume_parser_agent` (Groq) → SQLite + ChromaDB
2. Create job → `POST /api/jobs/` → `jd_analyzer_agent` (Groq) → SQLite + ChromaDB
3. Rank → `GET /api/jobs/{id}/match/stream` → SSE stream; for each resume: `matching_agent` + `explanation_agent` → save `Match` to SQLite → yield event
4. Fetch results → `GET /api/jobs/{id}/candidates` → ranked `Match` rows with resume join
5. ATS score → `GET /api/resumes/{id}/ats` → `ats_agent` (Groq) → JSON response

## Critical gotchas

**Python version**: Local system runs Python 3.9. Use `Optional[X]` / `List[X]` from `typing` — never `X | None` or `list[X]` (3.10+ syntax). Docker uses Python 3.11 (no constraint there).

**CORS**: `allow_origins=["*"]` requires `allow_credentials=False`. Safari hard-rejects the combination of wildcard origin + credentials=True ("Load failed").

**httpx version**: `groq==0.11.0` requires `httpx<0.28.0`. httpx 0.28+ dropped `proxies` support which groq uses internally. Pinned in `requirements.txt`.

**SSE DB session**: The `Depends(get_db)` session is closed before the `StreamingResponse` generator runs. The `match/stream` route captures needed data before the generator starts, then opens a fresh `SessionLocal()` inside the generator for all DB writes.

**Groq LLM calls**: All agents use `call_llm_json(system, user)` — two separate args, not a single combined prompt. Model: `llama-3.3-70b-versatile`. No `budget_tokens` or thinking support.

**ChromaDB stale state**: If you see `KeyError: '_type'` from ChromaDB, delete `backend/chroma_db/` and restart. The ONNX model re-downloads automatically from cache.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | (required) | Set in `backend/.env` locally, Space Secret on HF |
| `DATABASE_URL` | `sqlite:///./resume_ranking.db` | Docker: `sqlite:////data/resume_ranking.db` |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | Docker: `/data/chroma_db` |
| `UPLOAD_DIR` | `./uploads` | Docker: `/data/uploads` |

## HF Spaces deployment

The `README.md` contains the required HF Spaces YAML header (`sdk: docker`, `app_port: 7860`). Push the repo as-is to a HF Space with Docker SDK, add `GROQ_API_KEY` as a Space Secret.
