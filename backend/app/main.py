import uuid
import json
import os
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
from app.schemas import ScoreRequest, ScoreResponse, ChatRequest, ChatResponse
from app.scoring import compute_score

HISTORY_FILE = "history.json"
AUDIT_LOG_FILE = "audit_logs.json"


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

    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return ChatResponse(
            response="SaakhSetu Advisor is offline: Please set the GROQ_API_KEY environment variable on the server to enable AI features."
        )

    score_context = ""
    if payload.request_id:
        score_record = None
        if os.path.exists(AUDIT_LOG_FILE):
            try:
                with open(AUDIT_LOG_FILE, "r") as f:
                    logs = json.load(f)
                for log in logs:
                    if log.get("request_id") == payload.request_id:
                        score_record = log
                        break
            except Exception:
                pass
        
        if score_record:
            score_context = (
                f"The user's credit profile details are:\n"
                f"- Credit Score: {score_record.get('score')}/100\n"
                f"- Risk Category: {score_record.get('risk_category')}\n"
                f"- Repayment History Score: {score_record.get('repayment_history_score')}/100\n"
                f"- Land Area: {score_record.get('land_area_acres')} acres\n"
                f"- Annual Income Band: {score_record.get('annual_income_band')}\n"
                f"- Reason Codes: {', '.join(score_record.get('reason_codes', []))}\n"
                f"- Risk Summary: {score_record.get('risk_summary')}\n"
                f"- Recommendations: {', '.join(score_record.get('recommendations', []))}\n"
            )
        else:
            score_context = f"The requested request_id '{payload.request_id}' was not found in our history logs."

    system_prompt = (
        "You are SaakhSetu Credit Advisor, an AI assistant helping farmers understand their credit score.\n"
        "Your responsibilities:\n"
        "1. Explain scores in simple language.\n"
        "2. Explain reason codes.\n"
        "3. Suggest improvements.\n"
        "4. Explain risk categories.\n"
        "5. Help users understand factors affecting scoring.\n"
        "6. Never change the score.\n"
        "7. Never invent financial data.\n"
        "8. Use only provided score context.\n"
        "9. Keep responses under 150 words.\n"
        "10. Be clear and practical.\n\n"
    )
    if score_context:
        system_prompt += f"CONTEXT:\n{score_context}\n"
    else:
        system_prompt += "No specific credit score profile is loaded. Ask the user to run a calculation first or guide them generally.\n"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": payload.message}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=15.0
            )
        if response.status_code != 200:
            return ChatResponse(
                response=f"Error from Groq API (status code {response.status_code}): {response.text}"
            )
        
        result_data = response.json()
        bot_reply = result_data["choices"][0]["message"]["content"]
        return ChatResponse(response=bot_reply)
    except Exception as e:
        return ChatResponse(
            response=f"An error occurred while connecting to the AI Advisor: {str(e)}"
        )
