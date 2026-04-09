import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from database.database import init_db, SessionLocal
from database.models import Resume, Job, Match
from api.resume_routes import router as resume_router
from api.job_routes import router as job_router
from api.candidate_routes import router as candidate_router
from api.dashboard_routes import router as dashboard_router

load_dotenv()

os.makedirs(os.getenv("UPLOAD_DIR", "./uploads"), exist_ok=True)

app = FastAPI(
    title="AI Resume Ranking System",
    description="Enterprise-grade resume ranking and matching powered by Groq LLM + ChromaDB",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins=["*"] (CORS spec)
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers — registered first so they take priority over static files
app.include_router(resume_router)
app.include_router(job_router)
app.include_router(candidate_router)
app.include_router(dashboard_router)


@app.on_event("startup")
def startup():
    try:
        init_db()
    except Exception as e:
        print(f"⚠️  DB init failed (non-fatal): {e}")
    # Clear all data on every launch so each session starts fresh
    try:
        db = SessionLocal()
        try:
            db.query(Match).delete()
            db.query(Resume).delete()
            db.query(Job).delete()
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"⚠️  DB clear failed (non-fatal): {e}")
    try:
        from embeddings.embedding_service import EmbeddingService
        EmbeddingService().clear_all()
    except Exception as e:
        print(f"⚠️  ChromaDB clear failed (non-fatal): {e}")
    print("✅ Startup complete")


@app.get("/health")
def health():
    key = os.getenv("GROQ_API_KEY", "")
    return {
        "status": "ok",
        "groq_key_set": bool(key and key.startswith("gsk_")),
    }


# Serve Next.js static export when the `static/` directory exists.
# Uses a catch-all FastAPI route instead of app.mount("/", StaticFiles(...))
# because StaticFiles mounted at "/" is a Starlette sub-application that can
# intercept /health and /api/* routes with its own 404.html even when those
# routes are registered first — a well-documented Starlette edge case.
_static_dir = os.path.join(os.path.dirname(__file__), "static")
_static_real = os.path.realpath(_static_dir) if os.path.isdir(_static_dir) else None

if _static_real:
    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Resolve and jail to static dir to prevent path traversal
        candidate = os.path.realpath(os.path.join(_static_real, full_path or "index.html"))
        if not candidate.startswith(_static_real):
            return FileResponse(os.path.join(_static_real, "index.html"))
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        # SPA fallback — unknown paths serve index.html
        return FileResponse(os.path.join(_static_real, "index.html"))
else:
    @app.get("/")
    def root():
        return {"name": "AI Resume Ranking API", "version": "1.0.0", "docs": "/docs"}
