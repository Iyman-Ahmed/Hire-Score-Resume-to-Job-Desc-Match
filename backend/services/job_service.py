from typing import Optional, List
from sqlalchemy.orm import Session
from database.models import Job, Match, Resume
from agents.jd_analyzer_agent import analyze_job_description
from agents.matching_agent import score_match
from agents.explanation_agent import generate_explanation, generate_resume_feedback

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


def create_job(db: Session, title: str, company: str, description: str) -> Job:
    parsed = analyze_job_description(description)
    job = Job(title=title, company=company, description=description, parsed_requirements=parsed)
    db.add(job)
    db.flush()
    text_for_embed = (
        f"{parsed.get('role_title', title)} "
        f"{' '.join(parsed.get('required_skills', []))} "
        f"{description[:2000]}"
    )
    svc = _get_embedding_service()
    if svc:
        emb_id = svc.add_job(str(job.id), text_for_embed, {
            "title": title,
            "seniority": parsed.get("seniority_level", ""),
        })
        job.embedding_id = emb_id
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: int) -> Optional[Job]:
    return db.query(Job).filter(Job.id == job_id).first()


def list_jobs(db: Session, skip: int = 0, limit: int = 100) -> List[Job]:
    return db.query(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit).all()


def delete_job(db: Session, job_id: int) -> bool:
    job = get_job(db, job_id)
    if not job:
        return False
    if job.embedding_id:
        try:
            svc = _get_embedding_service()
            if svc:
                svc.delete_job(job.embedding_id)
        except Exception:
            pass
    db.delete(job)
    db.commit()
    return True


def match_all_resumes(db: Session, job_id: int) -> List[Match]:
    job = get_job(db, job_id)
    if not job:
        raise ValueError(f"Job {job_id} not found")
    parsed_jd = job.parsed_requirements or analyze_job_description(job.description)
    resumes = db.query(Resume).all()
    db.query(Match).filter(Match.job_id == job_id).delete()
    db.commit()
    matches = []
    for resume in resumes:
        parsed_resume = resume.parsed_data or {}
        try:
            scores = score_match(parsed_resume, parsed_jd)
            explanation = generate_explanation(parsed_resume, parsed_jd, scores)
            feedback = generate_resume_feedback(parsed_resume, parsed_jd, scores)
            match = Match(
                resume_id=resume.id,
                job_id=job_id,
                skill_score=scores.get("skill_match_score", 0),
                experience_score=scores.get("experience_match_score", 0),
                education_score=scores.get("education_match_score", 0),
                keyword_score=scores.get("keyword_alignment_score", 0),
                overall_score=scores.get("overall_score", 0),
                matching_skills=scores.get("matching_skills", []),
                skill_gaps=scores.get("missing_required_skills", []),
                strengths=scores.get("strengths", []),
                weaknesses=scores.get("weaknesses", []),
                recommendation=scores.get("recommendation", ""),
                explanation=explanation.get("detailed_explanation", ""),
                resume_feedback=str(feedback),
            )
            db.add(match)
            matches.append(match)
        except Exception as e:
            print(f"Error matching resume {resume.id}: {e}")
            continue
    db.flush()
    matches.sort(key=lambda m: m.overall_score, reverse=True)
    for rank, match in enumerate(matches, 1):
        match.rank = rank
    db.commit()
    for m in matches:
        db.refresh(m)
    return matches


def get_ranked_candidates(db: Session, job_id: int) -> List[Match]:
    return db.query(Match).filter(Match.job_id == job_id).order_by(Match.rank).all()
