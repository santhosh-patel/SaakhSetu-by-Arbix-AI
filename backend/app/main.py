import uuid
import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before other app modules read os.environ
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

import time
from collections import defaultdict

chat_rate_limits = defaultdict(list)

import httpx

from app.audit import log_score_request
from app.database import init_db
from app.knowledge_base import build_advisor_system_prompt
from app.schemas import ScoreRequest, ScoreResponse, ChatRequest, ChatResponse
from app.scoring import compute_score

HISTORY_FILE = "history.json"
AUDIT_LOG_FILE = "audit_logs.json"

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_CHAT_MODEL_PRIMARY = os.environ.get("GROQ_CHAT_MODEL", "llama-3.1-8b-instant")
GROQ_CHAT_MODEL_FALLBACK = os.environ.get(
    "GROQ_CHAT_MODEL_FALLBACK", "llama-3.3-70b-versatile"
)


def _groq_chat_models() -> list[str]:
    models: list[str] = []
    for model in (GROQ_CHAT_MODEL_PRIMARY, GROQ_CHAT_MODEL_FALLBACK):
        if model and model not in models:
            models.append(model)
    return models


async def _call_groq_chat(
    client: httpx.AsyncClient,
    api_key: str,
    model: str,
    system_prompt: str,
    user_message: str,
) -> httpx.Response:
    return await client.post(
        GROQ_CHAT_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.25,
            "max_tokens": 350,
        },
        timeout=30.0,
    )


async def _complete_advisor_chat(
    api_key: str, system_prompt: str, user_message: str
) -> tuple[str | None, str | None]:
    """Try primary Groq model, then fallback. Returns (reply, error_message)."""
    errors: list[str] = []
    async with httpx.AsyncClient() as client:
        for model in _groq_chat_models():
            try:
                response = await _call_groq_chat(
                    client, api_key, model, system_prompt, user_message
                )
            except Exception as exc:
                errors.append(f"{model}: {exc}")
                continue
            if response.status_code == 200:
                result_data = response.json()
                return result_data["choices"][0]["message"]["content"], None
            errors.append(f"{model}: HTTP {response.status_code} — {response.text}")
    return None, "Error from Groq API:\n" + "\n".join(errors)


def save_to_history(request_id: str, timestamp: str, score: float):
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r") as f:
                history = json.load(f)
        except Exception:
            history = []
    history.append({
        "request_id": request_id,
        "timestamp": timestamp,
        "score": score
    })
    try:
        with open(HISTORY_FILE, "w") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass


def save_to_audit_logs(entry: dict):
    logs = []
    if os.path.exists(AUDIT_LOG_FILE):
        try:
            with open(AUDIT_LOG_FILE, "r") as f:
                logs = json.load(f)
        except Exception:
            logs = []
    logs.append(entry)
    try:
        with open(AUDIT_LOG_FILE, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception:
        pass


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Initialise the SQLite audit database on startup."""
    init_db()
    yield


app = FastAPI(title="SaakhSetu Scoring API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse)
def score(payload: ScoreRequest) -> ScoreResponse:
    request_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    score_value, reason_codes, contributions, risk_category, risk_summary, recommendations = compute_score(payload)
    log_score_request(request_id, timestamp, payload, score_value, reason_codes, contributions)

    # Save to history.json
    save_to_history(request_id, timestamp, score_value)

    # Save to audit_logs.json
    audit_entry = {
        "request_id": request_id,
        "timestamp": timestamp,
        "score": score_value,
        "reason_codes": reason_codes,
        "risk_category": risk_category,
        "land_area_acres": payload.land_area_acres,
        "crop_type": payload.crop_type,
        "repayment_history_score": payload.repayment_history_score,
        "annual_income_band": payload.annual_income_band.value,
        "risk_summary": risk_summary,
        "recommendations": recommendations
    }
    save_to_audit_logs(audit_entry)

    return ScoreResponse(
        request_id=request_id,
        score=score_value,
        reason_codes=reason_codes,
        contributions=contributions,
        risk_category=risk_category,
        risk_summary=risk_summary,
        recommendations=recommendations,
        timestamp=timestamp,
    )


@app.get("/scores")
def get_scores():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


@app.get("/scores/{request_id}")
def get_score_by_id(request_id: str):
    if os.path.exists(AUDIT_LOG_FILE):
        try:
            with open(AUDIT_LOG_FILE, "r") as f:
                logs = json.load(f)
            for log in logs:
                if log.get("request_id") == request_id:
                    return log
        except Exception:
            pass
    raise HTTPException(status_code=404, detail="Score record not found")


@app.get("/audit-logs")
def get_audit_logs():
    if not os.path.exists(AUDIT_LOG_FILE):
        return []
    try:
        with open(AUDIT_LOG_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest, request: Request):
    if len(payload.message) > 250:
        return ChatResponse(
            response="Your query is too long. The advisor chatbot accepts a maximum of 250 characters."
        )

    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    # Keep only requests within the last 24 hours (86400 seconds)
    chat_rate_limits[client_ip] = [t for t in chat_rate_limits[client_ip] if current_time - t < 86400]
    if len(chat_rate_limits[client_ip]) >= 30:
        return ChatResponse(
            response="Daily query limit reached (maximum 30 queries per day). Please try again tomorrow."
        )
    chat_rate_limits[client_ip].append(current_time)

    api_key = (os.environ.get("GROQ_API_KEY") or "").strip()
    if not api_key:
        return ChatResponse(
            response="SaakhSetu Advisor is offline: Please set the GROQ_API_KEY environment variable on the server to enable AI features."
        )

    system_prompt = build_advisor_system_prompt(
        payload.message, request_id=payload.request_id
    )

    try:
        bot_reply, error = await _complete_advisor_chat(
            api_key, system_prompt, payload.message
        )
        if bot_reply:
            return ChatResponse(response=bot_reply)
        return ChatResponse(response=error or "Unknown error from AI Advisor.")
    except Exception as e:
        return ChatResponse(
            response=f"An error occurred while connecting to the AI Advisor: {str(e)}"
        )
