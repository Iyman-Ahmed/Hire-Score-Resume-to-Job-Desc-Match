"""
ATS Resume Scoring Agent
Scores a resume for ATS readability and returns section-by-section
scores with actionable improvement suggestions.
"""
from typing import Optional
from agents.base_agent import call_llm_json


def score_ats(parsed_resume: dict, raw_text: Optional[str] = "") -> dict:
    """
    Analyze a parsed resume and return ATS readability scores + suggestions.
    Returns:
        overall_ats_score, readability_score, keyword_density_score, format_score,
        sections (contact_info, summary, skills, experience, education, certifications),
        top_improvements, ats_tips
    """
    sections_present = {
        "contact_info": bool(parsed_resume.get("email") or parsed_resume.get("phone")),
        "summary": bool(parsed_resume.get("summary")),
        "skills": bool(parsed_resume.get("skills")),
        "experience": bool(parsed_resume.get("experience")),
        "education": bool(parsed_resume.get("education")),
        "certifications": bool(parsed_resume.get("certifications")),
    }

    skills_list = ", ".join((parsed_resume.get("skills") or [])[:20]) or "None found"
    exp_count = len(parsed_resume.get("experience") or [])
    edu_count = len(parsed_resume.get("education") or [])
    cert_count = len(parsed_resume.get("certifications") or [])
    proj_count = len(parsed_resume.get("projects") or [])
    summary_text = str(parsed_resume.get("summary") or "")[:400] or "Not provided"

    prompt = f"""Analyze the resume below and return a structured JSON with section-by-section ATS
readability scores and specific, actionable improvement suggestions.

Resume Information:
- Name: {parsed_resume.get('name', 'Not found')}
- Email: {parsed_resume.get('email', 'Not found')}
- Phone: {parsed_resume.get('phone', 'Not found')}
- Location: {parsed_resume.get('location', 'Not found')}
- Professional Summary: {summary_text}
- Skills ({len(parsed_resume.get('skills') or [])} found): {skills_list}
- Work Experience entries: {exp_count}
- Education entries: {edu_count}
- Certifications: {cert_count}
- Projects: {proj_count}
- Sections detected: {sections_present}

Scoring rules:
- Score 0-100 for each dimension
- Status: "good" (score>=75), "needs_work" (score 40-74), "missing" (score<40 or not present)
- Suggestions must be specific and immediately actionable (not generic)
- overall_ats_score = weighted average of all section scores

Return ONLY valid JSON, no other text:
{{
  "overall_ats_score": <integer 0-100>,
  "readability_score": <integer 0-100>,
  "keyword_density_score": <integer 0-100>,
  "format_score": <integer 0-100>,
  "sections": {{
    "contact_info": {{
      "score": <integer 0-100>,
      "status": "good"|"needs_work"|"missing",
      "suggestions": ["specific suggestion", "specific suggestion"]
    }},
    "summary": {{
      "score": <integer 0-100>,
      "status": "good"|"needs_work"|"missing",
      "suggestions": ["specific suggestion", "specific suggestion"]
    }},
    "skills": {{
      "score": <integer 0-100>,
      "status": "good"|"needs_work"|"missing",
      "suggestions": ["specific suggestion", "specific suggestion"]
    }},
    "experience": {{
      "score": <integer 0-100>,
      "status": "good"|"needs_work"|"missing",
      "suggestions": ["specific suggestion", "specific suggestion"]
    }},
    "education": {{
      "score": <integer 0-100>,
      "status": "good"|"needs_work"|"missing",
      "suggestions": ["specific suggestion"]
    }},
    "certifications": {{
      "score": <integer 0-100>,
      "status": "good"|"needs_work"|"missing",
      "suggestions": ["specific suggestion"]
    }}
  }},
  "top_improvements": [
    "highest-impact improvement 1",
    "highest-impact improvement 2",
    "highest-impact improvement 3"
  ],
  "ats_tips": [
    "ATS formatting tip 1",
    "ATS formatting tip 2"
  ]
}}"""

    result = call_llm_json(
        "You are an expert ATS resume reviewer. Return only valid JSON.",
        prompt,
        fast=True,
    )

    # Ensure required keys exist with safe defaults
    result.setdefault("overall_ats_score", 0)
    result.setdefault("readability_score", 0)
    result.setdefault("keyword_density_score", 0)
    result.setdefault("format_score", 0)
    result.setdefault("sections", {})
    result.setdefault("top_improvements", [])
    result.setdefault("ats_tips", [])
    return result
