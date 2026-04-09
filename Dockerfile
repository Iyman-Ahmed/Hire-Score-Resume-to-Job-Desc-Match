# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build Next.js static frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /build/frontend

# Install deps first (layer cache)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Copy source and build static export
COPY frontend/ ./
# Empty NEXT_PUBLIC_API_URL → API calls use same origin (relative URLs)
RUN NEXT_PUBLIC_API_URL="" npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Python backend + bundled frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# HF Spaces runs as non-root user 1000
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install system libraries required by onnxruntime (used by ChromaDB embeddings)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy Next.js static output into backend/static/
COPY --from=frontend-builder /build/frontend/out ./backend/static/

# Persistent data directories (chroma_db, uploads, sqlite db)
RUN mkdir -p /data/chroma_db /data/uploads && \
    chown -R appuser:appuser /app /data

USER appuser

WORKDIR /app/backend

# Override env so data lives in a writable volume path.
# XDG_CACHE_HOME pins the ONNX model cache to /app/.cache — a fixed path
# inside the image that is independent of $HOME. This ensures the pre-baked
# model is always found at runtime regardless of how HF Spaces sets HOME.
ENV CHROMA_PERSIST_DIR=/data/chroma_db \
    UPLOAD_DIR=/data/uploads \
    DATABASE_URL=sqlite:////data/resume_ranking.db \
    XDG_CACHE_HOME=/app/.cache \
    PYTHONUNBUFFERED=1

# Pre-download the 79MB ONNX embedding model at build time so container
# startup is instant and HF Spaces health checks never time out.
RUN python3 -c "from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2; ONNXMiniLM_L6_V2()"

# HF Spaces requires port 7860
EXPOSE 7860

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
