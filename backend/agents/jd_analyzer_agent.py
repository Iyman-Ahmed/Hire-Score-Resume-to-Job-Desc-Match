"""
Job Description Analyzer Agent
Extracts structured requirements from job description text using Groq LLM.
"""
from agents.base_agent import call_llm_json

SYSTEM_PROMPT = """You are an expert HR analyst. Extract structured requirements from job descriptions.

Return ONLY valid JSON with this exact structure:
{
  "role_title": "Software Engineer",
  "seniority_level": "mid",
  "required_skills": ["Python", "SQL", "AWS"],
  "preferred_skills": ["Kubernetes", "Terraform"],
  "experience_required": "3-5 years",
  "experience_years_min": 3,
  "experience_years_max": 5,
  "education_required": "Bachelor's degree in Computer Science or related field",
  "responsibilities": [
    "Design and implement backend services",
    "Collaborate with cross-functional teams"
  ],
  "keywords": ["microservices", "agile", "ci/cd", "rest api"],
  "nice_to_have": ["Experience with ML", "Open source contributions"],
  "industry": "Technology",
  "employment_type": "full-time"
}

Rules:
- seniority_level must be one of: "junior", "mid", "senior", "lead", "executive"
- Extract ALL technical skills (languages, frameworks, tools, platforms)
- Separate required vs preferred/nice-to-have skills
- keywords should include domain-specific terms and buzzwords
- experience_years_min/max: use 0/null if not specified
"""


def analyze_job_description(description: str) -> dict:
    """Analyze job description and extract structured requirements."""
    user_prompt = f"Analyze this job description:\n\n{description[:8000]}"
    return call_llm_json(SYSTEM_PROMPT, user_prompt)
