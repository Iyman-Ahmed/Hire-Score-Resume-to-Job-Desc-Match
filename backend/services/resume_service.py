from typing import Optional, List
from sqlalchemy.orm import Session
from database.models import Resume
from agents.resume_parser_agent import parse_resume
from utils.file_parser import extract_text

_embedding_service = None

def _get_embedding_service():
    global _embedding_service
    if _embedding_service is None:
        try:
            from embeddings.embedding_service import EmbeddingService
            _embedding_service = EmbeddingService()
        except Exception as e:
            print(f"⚠️  EmbeddingService unavailable: {e}")
    return _embedding_service


def create_resume(db: Session, filename: str, file_bytes: bytes) -> Resume:
    raw_text = extract_text(filename, file_bytes)
    parsed = parse_resume(raw_text)
    resume = Resume(filename=filename, raw_text=raw_text, parsed_data=parsed)
    db.add(resume)
    db.flush()
    text_for_embed = (
        f"{parsed.get('name', '')} "
        f"{' '.join(parsed.get('skills', []))} "
        f"{raw_text[:2000]}"
    )
    svc = _get_embedding_service()
    if svc:
        emb_id = svc.add_resume(str(resume.id), text_for_embed, {
            "name": parsed.get("name", ""),
            "skills": ", ".join(parsed.get("skills", [])[:20]),
        })
        resume.embedding_id = emb_id
    db.commit()
    db.refresh(resume)
    return resume


def get_resume(db: Session, resume_id: int) -> Optional[Resume]:
    return db.query(Resume).filter(Resume.id == resume_id).first()


def list_resumes(db: Session, skip: int = 0, limit: int = 100) -> List[Resume]:
    return db.query(Resume).order_by(Resume.created_at.desc()).offset(skip).limit(limit).all()


def delete_resume(db: Session, resume_id: int) -> bool:
    resume = get_resume(db, resume_id)
    if not resume:
        return False
    if resume.embedding_id:
        try:
            svc = _get_embedding_service()
            if svc:
                svc.delete_resume(resume.embedding_id)
        except Exception:
            pass
    db.delete(resume)
    db.commit()
    return True


def find_similar_candidates(resume_id: int, db: Session, n: int = 5) -> List[dict]:
    resume = get_resume(db, resume_id)
    if not resume or not resume.parsed_data:
        return []
    query = (
        f"{resume.parsed_data.get('name', '')} "
        f"{' '.join(resume.parsed_data.get('skills', []))}"
    )
    svc = _get_embedding_service()
    if not svc:
        return []
    similar = svc.find_similar_resumes(query, n=n, exclude_id=str(resume_id))
    results = []
    for item in similar:
        r = db.query(Resume).filter(Resume.id == int(item["id"])).first()
        if r:
            results.append({"resume": r, "similarity": 1 - item["distance"]})
    return results
