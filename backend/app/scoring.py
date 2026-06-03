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


def _generate_risk_summary(score: float, req: ScoreRequest) -> str:
    # Sentence 1: Repayment rating
    if req.repayment_history_score >= 80:
        s1 = "The applicant has a strong repayment history, demonstrating reliable credit behavior."
    elif req.repayment_history_score >= 50:
        s1 = "The applicant has a moderate repayment history, reflecting general financial diligence."
    else:
        s1 = "The applicant has a weak repayment history, indicating higher credit risk."

    # Sentence 2: Land area
    if req.land_area_acres >= 5:
        s2 = "Large land ownership provides solid agricultural asset backing."
    elif req.land_area_acres >= 1:
        s2 = "Moderate land acreage provides a stable basis for farming operations."
    else:
        s2 = "Small land area restricts cultivation scale and income potential."

    # Sentence 3: Income band
    if req.annual_income_band in (IncomeBand.OVER_10L, IncomeBand.BAND_5_10L):
        s3 = "A robust annual income profile offers strong credit security."
    elif req.annual_income_band == IncomeBand.BAND_2_5L:
        s3 = "A moderate annual income provides a basic financial buffer."
    else:
        s3 = "Low annual income limits the capacity to absorb financial shocks."

    # Sentence 4: Overall risk
    if score >= 60:
        s4 = "Overall credit risk is considered low, supporting favorable lending decisions."
    elif score >= 40:
        s4 = "Overall credit risk is moderate, indicating standard caution."
    else:
        s4 = "Overall credit risk is high, suggesting a need for additional risk mitigants."

    return f"{s1} {s2} {s3} {s4}"


def _generate_recommendations(reason_codes: list[str]) -> list[str]:
    mapping = {
        "weak_repayment": "Ensure timely repayment of all future obligations to build up your credit history.",
        "moderate_repayment": "Strive to clear past dues early to elevate your repayment standing.",
        "small_landholding": "Consider cooperative farming models or joint-liability structures to leverage scale.",
        "mid_landholding": "Formally register and document all land deeds to support future credit requests.",
        "low_income_band": "Route crop sale revenues through formal bank accounts to establish verifiable income.",
        "mid_income_band": "Maintain digital transaction records to verify secondary revenue streams.",
        "high_risk_crop": "Diversify your crop rotation with low-risk staples like wheat or paddy.",
        "medium_risk_crop": "Invest in crop insurance schemes to mitigate yield volatility.",
    }
    recs = []
    for code in reason_codes:
        if code in mapping:
            recs.append(mapping[code])

    # Fallbacks to ensure 2-3 recommendations
    fallbacks = [
        "Maintain a clean credit record by avoiding multiple concurrent loan inquiries.",
        "Keep well-documented records of all input purchase receipts and harvest sales."
    ]
    for fb in fallbacks:
        if len(recs) >= 3:
            break
        if fb not in recs:
            recs.append(fb)

    return recs[:3]


def compute_score(req: ScoreRequest) -> tuple[float, list[str], dict[str, float], str, str, list[str]]:
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

    # Compute risk category
    if score >= 60:
        risk_category = "LOW_RISK"
    elif score >= 40:
        risk_category = "MEDIUM_RISK"
    else:
        risk_category = "HIGH_RISK"

    risk_summary = _generate_risk_summary(score, req)
    recommendations = _generate_recommendations(reason_codes)

    return score, reason_codes, contributions, risk_category, risk_summary, recommendations
