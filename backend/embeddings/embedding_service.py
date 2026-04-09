"""
Embedding Service
Manages ChromaDB vector storage for resumes and jobs.
Uses ChromaDB's default embedding (all-MiniLM-L6-v2 via ONNX).
"""
import os
import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from dotenv import load_dotenv

load_dotenv()

PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")


class EmbeddingService:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=PERSIST_DIR)
        ef = ONNXMiniLM_L6_V2()

        self.resume_collection = self.client.get_or_create_collection(
            name="resumes",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )
        self.job_collection = self.client.get_or_create_collection(
            name="jobs",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Resume operations ─────────────────────────────────────────────────────

    def add_resume(self, doc_id: str, text: str, metadata: dict) -> str:
        """Store resume embedding. Returns the doc_id."""
        safe_meta = {k: str(v) for k, v in metadata.items() if isinstance(v, (str, int, float, bool))}
        self.resume_collection.upsert(
            ids=[doc_id],
            documents=[text],
            metadatas=[safe_meta],
        )
        return doc_id

    def find_similar_resumes(self, query_text: str, n: int = 5, exclude_id: str = None) -> list:
        """Find resumes similar to a query text."""
        results = self.resume_collection.query(
            query_texts=[query_text],
            n_results=min(n + 1, self.resume_collection.count() or 1),
        )
        items = []
        for i, doc_id in enumerate(results["ids"][0]):
            if doc_id == exclude_id:
                continue
            items.append({
                "id": doc_id,
                "distance": results["distances"][0][i],
                "metadata": results["metadatas"][0][i],
            })
        return items[:n]

    # ── Job operations ────────────────────────────────────────────────────────

    def add_job(self, doc_id: str, text: str, metadata: dict) -> str:
        """Store job embedding. Returns the doc_id."""
        safe_meta = {k: str(v) for k, v in metadata.items() if isinstance(v, (str, int, float, bool))}
        self.job_collection.upsert(
            ids=[doc_id],
            documents=[text],
            metadatas=[safe_meta],
        )
        return doc_id

    def find_similar_jobs(self, query_text: str, n: int = 3) -> list:
        """Find jobs similar to a candidate profile."""
        count = self.job_collection.count()
        if count == 0:
            return []
        results = self.job_collection.query(
            query_texts=[query_text],
            n_results=min(n, count),
        )
        return [
            {"id": doc_id, "distance": dist}
            for doc_id, dist in zip(results["ids"][0], results["distances"][0])
        ]

    def delete_resume(self, doc_id: str):
        self.resume_collection.delete(ids=[doc_id])

    def delete_job(self, doc_id: str):
        self.job_collection.delete(ids=[doc_id])

    def clear_all(self):
        """Delete all documents from both collections."""
        for col in (self.resume_collection, self.job_collection):
            ids = col.get()["ids"]
            if ids:
                col.delete(ids=ids)
