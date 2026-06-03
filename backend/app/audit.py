import json
import logging
from datetime import datetime, timezone

from app.database import save_audit_log
from app.schemas import ScoreRequest

logger = logging.getLogger("saakhsetu.audit")

_handler = logging.StreamHandler()
_handler.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(_handler)
logger.setLevel(logging.INFO)
logger.propagate = False


def log_score_request(
    request_id: str,
    timestamp: str,
    payload: ScoreRequest,
    score: float,
    reason_codes: list[str],
    contributions: dict[str, float],
) -> None:
    """Structured audit log for every scoring request (non-PII fields only).

    Writes JSON to stdout AND persists to SQLite.
    """
    logged_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    record = {
        "event": "score_request",
        "request_id": request_id,
        "timestamp": timestamp,
        "land_area_acres": payload.land_area_acres,
        "crop_type": payload.crop_type,
        "repayment_history_score": payload.repayment_history_score,
        "annual_income_band": payload.annual_income_band.value,
        "score": score,
        "reason_codes": reason_codes,
        "contributions": contributions,
        "logged_at": logged_at,
    }
    logger.info(json.dumps(record))

    # Persist to SQLite
    save_audit_log(
        request_id=request_id,
        timestamp=timestamp,
        land_area_acres=payload.land_area_acres,
        crop_type=payload.crop_type,
        repayment_history_score=payload.repayment_history_score,
        annual_income_band=payload.annual_income_band.value,
        score=score,
        reason_codes=reason_codes,
        contributions=contributions,
        logged_at=logged_at,
    )
