#!/bin/bash
cd "$(dirname "$0")/backend"

if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy .env.example and add your GROQ_API_KEY."
  exit 1
fi

echo "Starting backend at http://localhost:8000 ..."
python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
