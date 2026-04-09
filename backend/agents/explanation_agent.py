"""
Explanation Agent
Generates human-readable match explanations and resume improvement feedback.
"""
import json
from agents.base_agent import call_llm_json, call_llm

EXPLANATION_SYSTEM = """You are a senior technical recruiter providing detailed candidate analysis.
Generate a thorough, professional match explanation.

Return ONLY valid JSON with this structure:
{
  "summary": "2-3 sentence overall assessment",
  "detailed_explanation": "5-8 sentence detailed analysis covering skills, experience, and fit",
  "skill_gap_analysis": "Explanation of skill gaps and their impact on candidacy",
  "culture_fit_notes": "Notes on potential culture/role fit based on experience",
  "interview_focus_areas": ["Area 1 to probe in interview", "Area 2"],
  "resume_improvements": [
    "Add quantifiable achievements to each role",
    "Highlight specific AWS service experience"
  ],
  "hiring_recommendation": "Recommend / Consider / Pass"
}
"""

FEEDBACK_SYSTEM = """You are a professional resume coach. Provide specific, actionable resume improvement suggestions
for this candidate to better position themselves for this role.

Return ONLY valid JSON with this structure:
{
  "overall_feedback": "Overall assessment of the resume",
  "improvements": [
    {
      "area": "Skills Section",
      "issue": "Skills are listed without context",
      "suggestion": "Add proficiency levels and years of experience for each skill"
    }
  ],
  "missing_keywords": ["keyword1", "keyword2"],
  "recommended_courses": ["Course or certification to pursue"],
  "ats_tips": ["Tips to improve ATS (Applicant Tracking System) score"]
}
"""


def generate_explanation(parsed_resume: dict, parsed_jd: dict, match_scores: dict) -> dict:
    """Generate detailed explanation for a resume-job match."""
    user_prompt = f"""
CANDIDATE: {parsed_resume.get('name', 'Unknown')}
ROLE: {parsed_jd.get('role_title', 'Unknown')}

MATCH SCORES:
- Overall: {match_scores.get('overall_score', 0):.1f}/100
- Skills: {match_scores.get('skill_match_score', 0):.1f}/100
- Experience: {match_scores.get('experience_match_score', 0):.1f}/100
- Education: {match_scores.get('education_match_score', 0):.1f}/100
- Keywords: {match_scores.get('keyword_alignment_score', 0):.1f}/100

MATCHING SKILLS: {', '.join(match_scores.get('matching_skills', []))}
MISSING SKILLS: {', '.join(match_scores.get('missing_required_skills', []))}
STRENGTHS: {json.dumps(match_scores.get('strengths', []))}
WEAKNESSES: {json.dumps(match_scores.get('weaknesses', []))}

CANDIDATE EXPERIENCE: {json.dumps(parsed_resume.get('experience', [])[:3], indent=2)[:2000]}
JOB REQUIREMENTS: {json.dumps(parsed_jd.get('responsibilities', [])[:5])}
"""
    return call_llm_json(EXPLANATION_SYSTEM, user_prompt)


def generate_resume_feedback(parsed_resume: dict, parsed_jd: dict, match_scores: dict) -> dict:
    """Generate resume improvement feedback for the candidate."""
    user_prompt = f"""
CANDIDATE RESUME:
{json.dumps(parsed_resume, indent=2)[:3000]}

TARGET JOB:
Title: {parsed_jd.get('role_title')}
Required Skills: {', '.join(parsed_jd.get('required_skills', []))}
Keywords: {', '.join(parsed_jd.get('keywords', []))}

CURRENT MATCH: {match_scores.get('overall_score', 0):.1f}/100
MISSING SKILLS: {', '.join(match_scores.get('missing_required_skills', []))}

Provide specific, actionable resume improvement advice.
"""
    return call_llm_json(FEEDBACK_SYSTEM, user_prompt)
