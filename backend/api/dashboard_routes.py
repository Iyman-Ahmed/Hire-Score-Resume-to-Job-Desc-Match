from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.database import get_db
from database.models import Resume, Job, Match

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """High-level hiring metrics for the dashboard."""
    total_resumes = db.query(func.count(Resume.id)).scalar() or 0
    total_jobs = db.query(func.count(Job.id)).scalar() or 0
    total_matches = db.query(func.count(Match.id)).scalar() or 0

    avg_score = db.query(func.avg(Match.overall_score)).scalar()
    avg_score = round(avg_score, 1) if avg_score else 0.0

    strong_matches = (
        db.query(func.count(Match.id))
        .filter(Match.recommendation.in_(["Strong Match", "Good Match"]))
        .scalar() or 0
    )

    shortlisted = (
        db.query(func.count(Match.id))
        .filter(Match.recommendation == "Strong Match")
        .scalar() or 0
    )

    # Score distribution
    def count_range(low, high):
        return (
            db.query(func.count(Match.id))
            .filter(Match.overall_score >= low, Match.overall_score < high)
            .scalar() or 0
        )

    score_distribution = [
        {"range": "0–49",  "count": count_range(0, 50)},
        {"range": "50–64", "count": count_range(50, 65)},
        {"range": "65–79", "count": count_range(65, 80)},
        {"range": "80–100","count": count_range(80, 101)},
    ]

    # Recent activity: latest 5 resumes and 5 jobs
    recent_resumes = (
        db.query(Resume).order_by(Resume.created_at.desc()).limit(5).all()
    )
    recent_jobs = db.query(Job).order_by(Job.created_at.desc()).limit(5).all()

    return {
        "total_resumes": total_resumes,
        "total_jobs": total_jobs,
        "total_matches": total_matches,
        "avg_match_score": avg_score,
        "strong_matches": strong_matches,
        "shortlisted": shortlisted,
        "score_distribution": score_distribution,
        "recent_resumes": [
            {
                "id": r.id,
                "name": (r.parsed_data or {}).get("name", r.filename),
                "created_at": r.created_at.isoformat(),
            }
            for r in recent_resumes
        ],
        "recent_jobs": [
            {
                "id": j.id,
                "title": j.title,
                "company": j.company,
                "created_at": j.created_at.isoformat(),
            }
            for j in recent_jobs
        ],
    }
