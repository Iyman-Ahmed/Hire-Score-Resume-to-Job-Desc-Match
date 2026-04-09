"""
Semantic Matching Agent
Scores how well a resume matches a job description across multiple dimensions.
"""
import json
from agents.base_agent import call_llm_json

SYSTEM_PROMPT = """You are an expert technical recruiter and talent evaluator.
Analyze the match between a candidate's resume and a job description.

Return ONLY valid JSON with this exact structure:
{
  "skill_match_score": 85,
  "experience_match_score": 70,
  "education_match_score": 90,
  "keyword_alignment_score": 75,
  "overall_score": 80,
  "matching_skills": ["Python", "AWS", "SQL"],
  "missing_required_skills": ["Kubernetes", "Terraform"],
  "missing_preferred_skills": ["GraphQL"],
  "strengths": [
    "Strong Python background with 5+ years of experience",
    "Direct experience with AWS cloud services"
  ],
  "weaknesses": [
    "No containerization experience (Docker/K8s)",
    "Limited frontend development skills"
  ],
  "recommendation": "Strong Match",
  "recommendation_reason": "Candidate has 90% of required skills and relevant industry experience."
}

Scoring criteria:
- skill_match_score (0-100): % of required skills the candidate has
- experience_match_score (0-100): How well years/type of experience matches requirements
- education_match_score (0-100): Education level vs requirements (100 if exceeds/meets)
- keyword_alignment_score (0-100): Job keywords found in resume

overall_score = (skill_match_score * 0.40) + (experience_match_score * 0.30) + (keyword_alignment_score * 0.20) + (education_match_score * 0.10)

recommendation must be one of:
- "Strong Match" (overall_score >= 80)
- "Good Match" (overall_score >= 65)
- "Potential Match" (overall_score >= 50)
- "Weak Match" (overall_score < 50)

Be objective and data-driven. Consider partial matches for skills.
"""


def score_match(parsed_resume: dict, parsed_jd: dict) -> dict:
    """Score the match between a parsed resume and parsed job description."""
    user_prompt = f"""
CANDIDATE RESUME (parsed):
{json.dumps(parsed_resume, indent=2)[:4000]}

JOB REQUIREMENTS (parsed):
{json.dumps(parsed_jd, indent=2)[:3000]}

Evaluate the match and return scores.
"""
    result = call_llm_json(SYSTEM_PROMPT, user_prompt)

    # Ensure overall_score is correctly calculated
    skill = float(result.get("skill_match_score", 0))
    exp = float(result.get("experience_match_score", 0))
    edu = float(result.get("education_match_score", 0))
    kw = float(result.get("keyword_alignment_score", 0))
    result["overall_score"] = round(skill * 0.40 + exp * 0.30 + kw * 0.20 + edu * 0.10, 1)

    # Enforce recommendation based on score
    score = result["overall_score"]
    if score >= 80:
        result["recommendation"] = "Strong Match"
    elif score >= 65:
        result["recommendation"] = "Good Match"
    elif score >= 50:
        result["recommendation"] = "Potential Match"
    else:
        result["recommendation"] = "Weak Match"

    return result
