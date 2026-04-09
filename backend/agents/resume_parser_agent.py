"""
Resume Parser Agent
Extracts structured data from raw resume text using Groq LLM.
"""
from agents.base_agent import call_llm_json

SYSTEM_PROMPT = """You are an expert resume parser. Extract structured information from the provided resume text.

Return ONLY valid JSON with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com or null",
  "phone": "phone number or null",
  "location": "City, State/Country or null",
  "summary": "professional summary or null",
  "years_of_experience": 5.0,
  "skills": ["Python", "React", "AWS"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Dec 2022",
      "description": "Key responsibilities and achievements"
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "University Name",
      "year": "2018"
    }
  ],
  "certifications": ["AWS Certified Developer", "PMP"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["Python", "Docker"]
    }
  ],
  "languages": ["English", "Spanish"]
}

Rules:
- Extract ALL skills mentioned anywhere in the resume
- For years_of_experience, calculate from earliest job date to now (estimate if unclear)
- Include soft skills in the skills array
- If a field is not found, use null or empty array []
"""


def parse_resume(raw_text: str) -> dict:
    """Parse resume text into structured data."""
    user_prompt = f"Parse this resume:\n\n{raw_text[:8000]}"
    return call_llm_json(SYSTEM_PROMPT, user_prompt)
