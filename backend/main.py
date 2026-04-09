import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    init_db()
    # Clear all data on every launch so each session starts fresh
    db = SessionLocal()
    try:
        db.query(Match).delete()
        db.query(Resume).delete()
        db.query(Job).delete()
        db.commit()
    finally:
        db.close()
    try:
        from embeddings.embedding_service import EmbeddingService
        EmbeddingService().clear_all()
    except Exception as e:
        print(f"⚠️  ChromaDB clear failed (non-fatal): {e}")
    print("✅ Database initialized and cleared")


@app.get("/health")
def health():
    key = os.getenv("GROQ_API_KEY", "")
    return {
        "status": "ok",
        "groq_key_set": bool(key and key.startswith("gsk_")),
    }


# Serve Next.js static export when the `static/` directory exists.
# In local dev it won't exist, so the Next.js dev server handles the UI.
_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"name": "AI Resume Ranking API", "version": "1.0.0", "docs": "/docs"}
