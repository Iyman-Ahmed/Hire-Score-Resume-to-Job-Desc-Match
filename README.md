---
title: RecruitIQ — AI Resume Ranking Agent
emoji: 🎯
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# RecruitIQ — AI Resume Ranking Agent

> Multi-agent AI system that ranks resumes against job descriptions with skill gap analysis and ATS scoring

[![HuggingFace Space](https://img.shields.io/badge/🤗%20HuggingFace-Live%20Demo-blue)](https://huggingface.co/spaces/Iyman-ahmed/Hire-Score-Resume-to-Job-Desc-Match)
[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Groq](https://img.shields.io/badge/LLM-Groq%20llama--3.3--70b-orange)](https://groq.com)

---

## What it does

Upload one or more resumes (PDF/DOCX/TXT), paste a job description, and click **Rank Resumes**. The system:

1. **Parses every resume** — extracts name, email, skills, experience, education, certifications using Groq LLM
2. **Analyzes the job description** — identifies required skills, seniority level, experience requirements
3. **Scores each candidate** across 4 dimensions streamed live:
   - **Skills Match** (40%) — required skills the candidate has vs. gaps
   - **Experience Match** (30%) — years and type of experience vs. requirements
   - **Keyword Alignment** (20%) — JD keywords found in resume
   - **Education Match** (10%) — degree level vs. requirements
4. **Ranks candidates** by overall score with a recommendation label: *Strong Match / Good Match / Potential Match / Weak Match*
5. **ATS Score panel** (on-demand) — section-by-section ATS readability score for each resume with specific improvement suggestions

All data is session-scoped — the database is wiped on every restart so each run starts completely fresh.

---

## Features

| Feature | Details |
|---|---|
| Bulk resume upload | PDF, DOCX, TXT — any number of files |
| Live streaming results | SSE progress bar per candidate as scoring runs |
| 4-dimension scoring | Skills · Experience · Keywords · Education with weighted overall |
| Skill gap analysis | Missing required skills + matching skills listed per candidate |
| Strengths & weaknesses | AI-generated per candidate |
| ATS readability scorer | Section scores (contact, summary, skills, experience, education, certifications) + top improvements |
| Recommendation labels | Strong / Good / Potential / Weak Match |
| Session-scoped data | Clean slate every restart — no stale data accumulation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Groq `llama-3.3-70b-versatile` |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Vector search | ChromaDB + ONNX MiniLM-L6-v2 embeddings |
| Frontend | Next.js 14 (App Router, static export) + Tailwind CSS + Recharts |
| Deployment | Docker → Hugging Face Spaces (port 7860) |
| File parsing | pdfplumber (PDF) + python-docx (DOCX) |

---

## Architecture

```
Request → FastAPI (port 7860/8000)
             ├── /api/resumes/upload  → resume_parser_agent  (Groq)  → SQLite + ChromaDB
             ├── /api/jobs/           → jd_analyzer_agent    (Groq)  → SQLite + ChromaDB
             ├── /api/jobs/{id}/match/stream
             │        └── [per resume] matching_agent + explanation_agent (Groq)
             │                         → save Match to SQLite → SSE event → UI
             ├── /api/resumes/{id}/ats → ats_agent (Groq) → JSON
             └── /  (static)           → Next.js export (backend/static/)
```

### Agent pipeline

```
resume_parser_agent     — raw text → {name, email, skills, experience, education, ...}
jd_analyzer_agent       — JD text  → {required_skills, seniority_level, experience_required, ...}
matching_agent          — resume + JD → {skill_match_score, experience_match_score, overall_score, ...}
explanation_agent       — scores   → {detailed_explanation, strengths, weaknesses}
ats_agent               — resume   → {overall_ats_score, sections{contact/summary/skills/...}, top_improvements}
```

All agents call `call_llm_json(system, user)` in `agents/base_agent.py` — two separate args.

---

## Local Development

### Backend
```bash
cd backend
cp .env.example .env    # add your GROQ_API_KEY
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# Open http://localhost:3000
```

### Helper scripts
```bash
./start_backend.sh      # runs uvicorn on :8000
./start_frontend.sh     # runs Next.js dev on :3000
```

### Docker (matches HF Spaces exactly)
```bash
docker build -t recruitiq .
docker run -p 7860:7860 -e GROQ_API_KEY=gsk_... recruitiq
# Open http://localhost:7860
```

---

## Hugging Face Spaces Deployment

1. Push this repo to a HF Space with **Docker** SDK
2. Add `GROQ_API_KEY` as a **Space Secret** (Settings → Variables and secrets)
3. Click **Restart space** — the app builds and starts automatically at port 7860

The Docker build compiles the Next.js frontend as a static export and embeds it inside FastAPI, so the entire app runs as a single container with no external services.

---

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `GROQ_API_KEY` | *(required)* | Get free key at [console.groq.com](https://console.groq.com) |
| `DATABASE_URL` | `sqlite:///./resume_ranking.db` | Docker: `sqlite:////data/resume_ranking.db` |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | Docker: `/data/chroma_db` |
| `UPLOAD_DIR` | `./uploads` | Docker: `/data/uploads` |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/resumes/upload` | Upload resume files (multipart) |
| `GET` | `/api/resumes/` | List all parsed resumes |
| `GET` | `/api/resumes/{id}/ats` | Get ATS score for a resume |
| `POST` | `/api/jobs/` | Create job + analyze JD |
| `GET` | `/api/jobs/{id}/match/stream` | **SSE** — stream matching pipeline |
| `GET` | `/api/jobs/{id}/candidates` | Get ranked candidates after matching |
| `GET` | `/api/candidates/{id}/analysis` | Full AI analysis for a match |
| `GET` | `/api/dashboard/stats` | Aggregate KPI metrics |

Interactive docs available at `/docs` when running locally.
