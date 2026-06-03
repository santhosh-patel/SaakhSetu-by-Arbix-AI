from app.schemas import IncomeBand, ScoreRequest

# Crop risk classification
_LOW_RISK_CROPS = frozenset(
    ["wheat", "paddy", "rice", "barley", "ragi", "jowar"]
)
_MEDIUM_RISK_CROPS = frozenset(
    ["maize", "mustard", "cotton", "soybean", "groundnut"]
)


def _crop_risk(crop_type: str) -> tuple[int, str]:
    """Return (points, reason_code) for a given crop type."""
    normalised = crop_type.strip().lower()
    if normalised in _LOW_RISK_CROPS:
        return 15, "low_risk_crop"
    if normalised in _MEDIUM_RISK_CROPS:
        return 10, "medium_risk_crop"
    return 5, "high_risk_crop"


def compute_score(req: ScoreRequest) -> tuple[float, list[str], dict[str, float]]:
    """Rule-based scoring: repayment (35), land (25), income (25), crop risk (15)."""
    reason_codes: list[str] = []

    # Repayment history (0-35 points)
    if req.repayment_history_score >= 80:
        repayment_pts = 35
        reason_codes.append("good_repayment")
    elif req.repayment_history_score >= 50:
        repayment_pts = 22
        reason_codes.append("moderate_repayment")
    else:
        repayment_pts = 10
        reason_codes.append("weak_repayment")

    # Land area (0-25 points)
    if req.land_area_acres >= 5:
        land_pts = 25
        reason_codes.append("large_landholding")
    elif req.land_area_acres >= 1:
        land_pts = 18
        reason_codes.append("mid_landholding")
    else:
        land_pts = 8
        reason_codes.append("small_landholding")

    # Income band (0-25 points)
    income_map = {
        IncomeBand.OVER_10L: (25, "high_income_band"),
        IncomeBand.BAND_5_10L: (20, "upper_mid_income_band"),
        IncomeBand.BAND_2_5L: (15, "mid_income_band"),
        IncomeBand.UNDER_2L: (8, "low_income_band"),
    }
    income_pts, income_reason = income_map[req.annual_income_band]
    reason_codes.append(income_reason)

    # Crop risk (0-15 points)
    crop_pts, crop_reason = _crop_risk(req.crop_type)
    reason_codes.append(crop_reason)

    score = min(100.0, max(0.0, float(repayment_pts + land_pts + income_pts + crop_pts)))

    contributions = {
        "repayment_history": float(repayment_pts),
        "land_area": float(land_pts),
        "income_band": float(income_pts),
        "crop_risk": float(crop_pts),
    }

    assert len(reason_codes) == 4, "Must return exactly 4 reason codes"
    return score, reason_codes, contributions
