# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (FastAPI)
```bash
cd backend
cp .env.example .env        # add GROQ_API_KEY
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js)
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### Frontend static build (must pass before deploying)
```bash
cd frontend
NEXT_PUBLIC_API_URL="" npm run build   # outputs to frontend/out/
```

### Docker (matches HF Spaces exactly)
```bash
docker build -t resume-ranker .
docker run -p 7860:7860 -e GROQ_API_KEY=gsk_... resume-ranker
```

## Architecture

Single Docker container: Next.js static export served by FastAPI at `/`. All API calls are relative (same-origin) in production.

```
Request → FastAPI (port 7860/8000)
             ├── /api/*   → Python route handlers
             └── /        → Next.js static files (backend/static/)
```

### Backend layout (`backend/`)
- **`main.py`** — App entry point. Registers routers, serves static frontend. On every startup: wipes all SQLite tables + ChromaDB collections so each session is fresh.
- **`agents/`** — Stateless LLM agents, each a single function:
  - `base_agent.py` — `call_llm(system, user)` / `call_llm_json(system, user)` wrappers for Groq. **Both args required — never call with one arg.**
  - `resume_parser_agent.py` — raw text → structured resume fields
  - `jd_analyzer_agent.py` — JD text → structured requirements
  - `matching_agent.py` — scores resume vs JD; `overall_score = skill*0.40 + exp*0.30 + keyword*0.20 + edu*0.10`
  - `explanation_agent.py` — scores → human-readable explanation + feedback
  - `ats_agent.py` — section-by-section ATS readability scores + suggestions
- **`api/`** — FastAPI routers: `resume_routes`, `job_routes`, `candidate_routes`, `dashboard_routes`
- **`services/`** — SQLAlchemy CRUD layer consumed by routes
- **`embeddings/embedding_service.py`** — ChromaDB with `ONNXMiniLM_L6_V2`; 79MB model downloads on first run, cached at `~/.cache/chroma/onnx_models/`. Has `clear_all()` method used on startup.
- **`database/`** — SQLAlchemy models (`Resume`, `Job`, `Match`) + `SessionLocal`

### Frontend layout (`frontend/`)
- **`app/page.tsx`** — Entire app UI: resume upload + JD input → SSE streaming match → animated ranked results + ATS panel. This is the only user-facing page.
- **`lib/api.ts`** — All API calls. `NEXT_PUBLIC_API_URL` sets base URL (empty string = relative for production).
- **`lib/types.ts`** — Shared TypeScript interfaces.

### Key data flow
1. Upload resumes → `POST /api/resumes/upload` → `resume_parser_agent` → SQLite + ChromaDB
2. Create job → `POST /api/jobs/` → `jd_analyzer_agent` → SQLite + ChromaDB
3. Rank → `GET /api/jobs/{id}/match/stream` → SSE; per resume: `matching_agent` + `explanation_agent` → save `Match` → yield event
4. Fetch results → `GET /api/jobs/{id}/candidates` → returns `{candidates: [...]}` (not a raw array)
5. ATS score → `GET /api/resumes/{id}/ats` → `ats_agent` → JSON

## Critical gotchas

**Python version**: Local system runs Python 3.9. Use `Optional[X]` / `List[X]` from `typing` — never `X | None` or `list[X]`. Docker uses Python 3.11.

**CORS**: `allow_origins=["*"]` requires `allow_credentials=False`. Safari rejects wildcard origin + credentials=True with "Load failed".

**httpx version**: `groq==0.11.0` requires `httpx<0.28.0`. httpx 0.28+ dropped `proxies` support. Pinned in `requirements.txt`.

**SSE DB session**: `Depends(get_db)` closes before `StreamingResponse` generator runs. The `match/stream` route captures all needed data before the generator, then opens a fresh `SessionLocal()` inside the generator for DB writes.

**Groq agents**: All use `call_llm_json(system, user)` — two separate string args. Never pass a single combined prompt.

**ChromaDB stale state**: `KeyError: '_type'` means stale `backend/chroma_db/`. Delete it and restart — ONNX model re-downloads from cache.

**Next.js static export**: `output: "export"` in `next.config.mjs`. Dynamic `[id]` routes with `"use client"` **cannot** use `generateStaticParams` in the same file — requires a server component wrapper. Currently these routes are removed; the full app lives on `app/page.tsx`.

## Deployment

**GitHub → HF Spaces pipeline**: `.github/workflows/deploy.yml` pushes to `https://huggingface.co/spaces/Iyman-ahmed/Hire-Score-Resume-to-Job-Desc-Match` on every push to `main`. Requires `HF_TOKEN` secret in GitHub repo settings.

**HF Spaces**: `README.md` has required YAML header (`sdk: docker`, `app_port: 7860`). Add `GROQ_API_KEY` as a Space Secret.

## Environment variables

| Variable | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | (required) | `backend/.env` locally; Space Secret on HF |
| `DATABASE_URL` | `sqlite:///./resume_ranking.db` | Docker: `sqlite:////data/resume_ranking.db` |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | Docker: `/data/chroma_db` |
| `UPLOAD_DIR` | `./uploads` | Docker: `/data/uploads` |
