import uuid
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.audit import log_score_request
from app.schemas import ScoreRequest, ScoreResponse
from app.scoring import compute_score

app = FastAPI(title="SaakhSetu Scoring API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

    score_value, reason_codes = compute_score(payload)
    log_score_request(request_id, timestamp, payload, score_value, reason_codes)

    return ScoreResponse(
        request_id=request_id,
        score=score_value,
        reason_codes=reason_codes,
        timestamp=timestamp,
    )
