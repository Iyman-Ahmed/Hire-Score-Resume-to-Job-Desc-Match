from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database.database import get_db
from services import resume_service

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.post("/upload")
async def upload_resumes(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    """Upload one or more resume files (PDF, DOCX, TXT)."""
    results = []
    errors = []

    for file in files:
        try:
            file_bytes = await file.read()
            resume = resume_service.create_resume(db, file.filename, file_bytes)
            results.append({
                "id": resume.id,
                "filename": resume.filename,
                "candidate_name": resume.parsed_data.get("name", resume.filename),
                "skills_count": len(resume.parsed_data.get("skills", [])),
                "years_of_experience": resume.parsed_data.get("years_of_experience"),
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})

    return {"uploaded": results, "errors": errors}


@router.get("/")
def list_resumes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    resumes = resume_service.list_resumes(db, skip=skip, limit=limit)
    return [_resume_summary(r) for r in resumes]


@router.get("/{resume_id}")
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    resume = resume_service.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {
        "id": resume.id,
        "filename": resume.filename,
        "parsed_data": resume.parsed_data,
        "created_at": resume.created_at.isoformat(),
    }


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    ok = resume_service.delete_resume(db, resume_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"message": "Resume deleted"}


@router.get("/{resume_id}/ats")
def get_ats_score(resume_id: int, db: Session = Depends(get_db)):
    """Run ATS readability analysis on a parsed resume."""
    from agents.ats_agent import score_ats
    resume = resume_service.get_resume(db, resume_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    try:
        return score_ats(resume.parsed_data or {}, resume.raw_text or "")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS analysis failed: {str(e)}")


@router.get("/{resume_id}/similar")
def similar_candidates(resume_id: int, n: int = 5, db: Session = Depends(get_db)):
    """Find candidates with similar skill profiles."""
    results = resume_service.find_similar_candidates(resume_id, db, n=n)
    return [
        {
            "id": item["resume"].id,
            "name": item["resume"].parsed_data.get("name", "Unknown"),
            "skills": item["resume"].parsed_data.get("skills", [])[:10],
            "similarity_score": round(item["similarity"] * 100, 1),
        }
        for item in results
    ]


def _resume_summary(r):
    pd = r.parsed_data or {}
    return {
        "id": r.id,
        "filename": r.filename,
        "candidate_name": pd.get("name", r.filename),
        "email": pd.get("email"),
        "skills": pd.get("skills", [])[:8],
        "years_of_experience": pd.get("years_of_experience"),
        "education": pd.get("education", [])[:1],
        "created_at": r.created_at.isoformat(),
    }
