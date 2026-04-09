from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database.database import get_db
from database.models import Resume
from services import job_service

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    company: Optional[str] = None
    description: str


@router.post("/")
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    """Create a job posting and analyze its requirements."""
    job = job_service.create_job(db, payload.title, payload.company or "", payload.description)
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "parsed_requirements": job.parsed_requirements,
        "created_at": job.created_at.isoformat(),
    }


@router.get("/")
def list_jobs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    jobs = job_service.list_jobs(db, skip=skip, limit=limit)
    return [_job_summary(j, db) for j in jobs]


@router.get("/{job_id}")
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "parsed_requirements": job.parsed_requirements,
        "status": job.status,
        "created_at": job.created_at.isoformat(),
    }


@router.delete("/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    ok = job_service.delete_job(db, job_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted"}


@router.post("/{job_id}/match")
def match_resumes(job_id: int, db: Session = Depends(get_db)):
    """Run full matching pipeline (blocking) and return ranked candidates."""
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    matches = job_service.match_all_resumes(db, job_id)
    return {
        "job_id": job_id,
        "total_matched": len(matches),
        "candidates": [_match_summary(m) for m in matches],
    }


@router.get("/{job_id}/match/stream")
def match_resumes_stream(job_id: int, db: Session = Depends(get_db)):
    """Stream the matching pipeline via SSE, saving results to DB as it goes."""
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Capture all data before FastAPI closes the Depends(get_db) session
    parsed_jd = job.parsed_requirements or {}
    resumes_snapshot = [
        {"id": r.id, "parsed_data": r.parsed_data or {}}
        for r in db.query(Resume).all()
    ]

    def event_generator():
        import json as _json
        from database.database import SessionLocal
        from database.models import Match as MatchModel
        from agents.matching_agent import score_match
        from agents.explanation_agent import generate_explanation, generate_resume_feedback

        def sse(event: str, payload: dict) -> str:
            return f"data: {_json.dumps({'event': event, **payload})}\n\n"

        gen_db = SessionLocal()
        try:
            # Clear old matches for this job
            gen_db.query(MatchModel).filter(MatchModel.job_id == job_id).delete()
            gen_db.commit()

            total = len(resumes_snapshot)
            yield sse("start", {"total": total})

            saved_matches = []
            for idx, resume in enumerate(resumes_snapshot, 1):
                parsed_resume = resume["parsed_data"]
                name = parsed_resume.get("name", f"Resume #{resume['id']}")

                yield sse("progress", {
                    "current": idx, "total": total,
                    "candidate": name, "score": 0,
                })

                try:
                    scores = score_match(parsed_resume, parsed_jd)
                    explanation = generate_explanation(parsed_resume, parsed_jd, scores)
                    feedback = generate_resume_feedback(parsed_resume, parsed_jd, scores)

                    match = MatchModel(
                        resume_id=resume["id"],
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
                    gen_db.add(match)
                    gen_db.flush()
                    saved_matches.append(match)

                    yield sse("match_done", {
                        "current": idx, "total": total,
                        "candidate": name,
                        "score": scores.get("overall_score", 0),
                        "recommendation": scores.get("recommendation", ""),
                    })

                except Exception as exc:
                    yield sse("error", {"message": f"Failed to process {name}: {exc}"})

            # Assign ranks and persist
            saved_matches.sort(key=lambda m: m.overall_score, reverse=True)
            for rank, m in enumerate(saved_matches, 1):
                m.rank = rank
            gen_db.commit()

            yield sse("complete", {"total_processed": len(saved_matches)})

        except Exception as exc:
            yield sse("error", {"message": str(exc)})
        finally:
            gen_db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/{job_id}/candidates")
def get_candidates(job_id: int, db: Session = Depends(get_db)):
    """Get ranked candidate list for a job (after matching has been run)."""
    job = job_service.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    matches = job_service.get_ranked_candidates(db, job_id)
    return {
        "job_id": job_id,
        "job_title": job.title,
        "total": len(matches),
        "candidates": [_match_summary(m) for m in matches],
    }


def _job_summary(job, db):
    from database.models import Match
    match_count = db.query(Match).filter(Match.job_id == job.id).count()
    req = job.parsed_requirements or {}
    return {
        "id": job.id,
        "title": job.title,
        "company": job.company,
        "status": job.status,
        "required_skills": req.get("required_skills", [])[:6],
        "seniority_level": req.get("seniority_level", ""),
        "experience_required": req.get("experience_required", ""),
        "match_count": match_count,
        "created_at": job.created_at.isoformat(),
    }


def _match_summary(m):
    pd = m.resume.parsed_data or {} if m.resume else {}
    return {
        "match_id": m.id,
        "resume_id": m.resume_id,
        "candidate_name": pd.get("name", f"Candidate #{m.resume_id}"),
        "email": pd.get("email"),
        "rank": m.rank,
        "overall_score": m.overall_score,
        "skill_score": m.skill_score,
        "experience_score": m.experience_score,
        "education_score": m.education_score,
        "keyword_score": m.keyword_score,
        "recommendation": m.recommendation,
        "matching_skills": m.matching_skills or [],
        "skill_gaps": m.skill_gaps or [],
        "strengths": m.strengths or [],
        "weaknesses": m.weaknesses or [],
    }
