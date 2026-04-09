import json
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

GROQ_MODEL = "llama-3.3-70b-versatile"
FAST_MODEL = "llama-3.1-8b-instant"


def get_client() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


def call_llm(system: str, user: str, json_mode: bool = False, fast: bool = False) -> str:
    """Single LLM call returning the response text."""
    client = get_client()
    kwargs = {
        "model": FAST_MODEL if fast else GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


def call_llm_json(system: str, user: str, fast: bool = False) -> dict:
    """LLM call that parses and returns a JSON dict."""
    raw = call_llm(system, user, json_mode=True, fast=fast)
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        # Strip markdown code fences if the model wrapped the JSON
        if not raw:
            raise ValueError("LLM returned empty response")
        cleaned = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(cleaned)
