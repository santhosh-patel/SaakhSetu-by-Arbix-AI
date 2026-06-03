from app.schemas import IncomeBand, ScoreRequest


def compute_score(req: ScoreRequest) -> tuple[float, list[str]]:
    """Rule-based scoring: repayment (40), land (30), income band (30)."""
    reason_codes: list[str] = []

    # Repayment history (0-40 points)
    if req.repayment_history_score >= 80:
        repayment_pts = 40
        reason_codes.append("good_repayment")
    elif req.repayment_history_score >= 50:
        repayment_pts = 25
        reason_codes.append("moderate_repayment")
    else:
        repayment_pts = 10
        reason_codes.append("weak_repayment")

    # Land area (0-30 points)
    if req.land_area_acres >= 5:
        land_pts = 30
        reason_codes.append("large_landholding")
    elif req.land_area_acres >= 1:
        land_pts = 20
        reason_codes.append("mid_landholding")
    else:
        land_pts = 10
        reason_codes.append("small_landholding")

    # Income band (0-30 points)
    income_map = {
        IncomeBand.OVER_10L: (30, "high_income_band"),
        IncomeBand.BAND_5_10L: (25, "upper_mid_income_band"),
        IncomeBand.BAND_2_5L: (20, "mid_income_band"),
        IncomeBand.UNDER_2L: (10, "low_income_band"),
    }
    income_pts, income_reason = income_map[req.annual_income_band]
    reason_codes.append(income_reason)

    score = min(100.0, max(0.0, float(repayment_pts + land_pts + income_pts)))

    assert len(reason_codes) == 3, "Must return exactly 3 reason codes"
    return score, reason_codes
