from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.database import get_db
from database.models import Match, Resume

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.get("/{match_id}/analysis")
def get_candidate_analysis(match_id: int, db: Session = Depends(get_db)):
    """Full AI analysis for a specific candidate-job match."""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    resume = match.resume
    pd = resume.parsed_data or {} if resume else {}

    return {
        "match_id": match.id,
        "job_id": match.job_id,
        "resume_id": match.resume_id,
        "candidate": {
            "name": pd.get("name", "Unknown"),
            "email": pd.get("email"),
            "phone": pd.get("phone"),
            "location": pd.get("location"),
            "summary": pd.get("summary"),
            "years_of_experience": pd.get("years_of_experience"),
            "skills": pd.get("skills", []),
            "experience": pd.get("experience", []),
            "education": pd.get("education", []),
            "certifications": pd.get("certifications", []),
            "projects": pd.get("projects", []),
        },
        "scores": {
            "overall": match.overall_score,
            "skill": match.skill_score,
            "experience": match.experience_score,
            "education": match.education_score,
            "keyword": match.keyword_score,
        },
        "recommendation": match.recommendation,
        "rank": match.rank,
        "matching_skills": match.matching_skills or [],
        "skill_gaps": match.skill_gaps or [],
        "strengths": match.strengths or [],
        "weaknesses": match.weaknesses or [],
        "explanation": match.explanation,
        "resume_feedback": match.resume_feedback,
        "created_at": match.created_at.isoformat(),
    }


@router.get("/resume/{resume_id}/matches")
def get_resume_matches(resume_id: int, db: Session = Depends(get_db)):
    """Get all job matches for a specific resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    matches = db.query(Match).filter(Match.resume_id == resume_id).all()
    return {
        "resume_id": resume_id,
        "candidate_name": (resume.parsed_data or {}).get("name", resume.filename),
        "matches": [
            {
                "match_id": m.id,
                "job_id": m.job_id,
                "job_title": m.job.title if m.job else "Unknown",
                "company": m.job.company if m.job else "",
                "overall_score": m.overall_score,
                "recommendation": m.recommendation,
                "rank": m.rank,
            }
            for m in matches
        ],
    }
