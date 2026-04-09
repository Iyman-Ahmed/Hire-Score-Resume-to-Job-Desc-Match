"""
Orchestrator Agent
Coordinates the full pipeline: parse → embed → match → rank → explain.
Yields SSE-formatted progress events for streaming.
"""
import json
from typing import Generator

from agents.resume_parser_agent import parse_resume
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


def _sse(event: str, data: dict) -> str:
    return f"data: {json.dumps({'event': event, **data})}\n\n"


def process_resume_upload(filename: str, raw_text: str) -> dict:
    """Parse a resume and return structured data + embedding ID."""
    parsed = parse_resume(raw_text)
    text_for_embed = f"{parsed.get('name','')} {' '.join(parsed.get('skills',[]))} {raw_text[:2000]}"
    emb_id = embedding_service.add_resume(str(id(raw_text)), text_for_embed, parsed)
    return {"parsed": parsed, "embedding_id": emb_id}


def process_job_creation(job_id: int, description: str) -> dict:
    """Analyze a job description and return structured requirements + embedding ID."""
    parsed = analyze_job_description(description)
    text_for_embed = f"{parsed.get('role_title','')} {' '.join(parsed.get('required_skills',[]))} {description[:2000]}"
    emb_id = embedding_service.add_job(str(job_id), text_for_embed, parsed)
    return {"parsed": parsed, "embedding_id": emb_id}


def run_matching_pipeline(
    job_id: int,
    job_parsed: dict,
    resumes: list,          # list of dicts: {id, parsed_data, raw_text}
    full_analysis: bool = True,
) -> Generator[str, None, None]:
    """
    Stream the matching pipeline progress as SSE events.
    Each event is a JSON string that the frontend can consume.
    """
    total = len(resumes)
    yield _sse("start", {"message": f"Starting analysis for {total} resume(s)...", "total": total})

    results = []

    for idx, resume in enumerate(resumes, 1):
        resume_id = resume["id"]
        parsed_resume = resume.get("parsed_data") or {}
        name = parsed_resume.get("name", f"Resume #{resume_id}")

        yield _sse("progress", {
            "message": f"Scoring {name} ({idx}/{total})...",
            "current": idx,
            "total": total,
            "resume_id": resume_id,
        })

        try:
            # Score match
            scores = score_match(parsed_resume, job_parsed)

            # Generate explanation only if full_analysis requested
            explanation_data = {}
            feedback_data = {}
            if full_analysis:
                yield _sse("progress", {
                    "message": f"Generating AI explanation for {name}...",
                    "current": idx,
                    "total": total,
                    "resume_id": resume_id,
                })
                explanation_data = generate_explanation(parsed_resume, job_parsed, scores)
                feedback_data = generate_resume_feedback(parsed_resume, job_parsed, scores)

            results.append({
                "resume_id": resume_id,
                "scores": scores,
                "explanation": explanation_data,
                "feedback": feedback_data,
            })

            yield _sse("match_done", {
                "resume_id": resume_id,
                "name": name,
                "overall_score": scores.get("overall_score", 0),
                "recommendation": scores.get("recommendation", ""),
            })

        except Exception as e:
            yield _sse("error", {
                "resume_id": resume_id,
                "message": f"Failed to process {name}: {str(e)}",
            })

    # Rank results by overall score
    results.sort(key=lambda r: r["scores"].get("overall_score", 0), reverse=True)
    for rank, r in enumerate(results, 1):
        r["rank"] = rank

    yield _sse("complete", {
        "message": "Analysis complete!",
        "total_processed": len(results),
        "results": [
            {
                "resume_id": r["resume_id"],
                "rank": r["rank"],
                "overall_score": r["scores"].get("overall_score", 0),
                "recommendation": r["scores"].get("recommendation", ""),
            }
            for r in results
        ],
    })

    # Final data event carrying all details
    yield _sse("data", {"results": results})
