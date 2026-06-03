"""Tests for advisor knowledge base."""

from app.knowledge_base import (
    build_advisor_system_prompt,
    format_score_context,
    get_knowledge_base,
    select_knowledge_for_query,
)


def test_knowledge_base_file_loads():
    kb = get_knowledge_base()
    assert len(kb) > 1000
    assert "Scoring model" in kb
    assert "good_repayment" in kb
    assert "high_risk_crop" in kb


def test_select_knowledge_returns_full_by_default():
    kb = select_knowledge_for_query("what is sugarcane crop risk?")
    assert "high_risk_crop" in kb
    assert "FAQ" in kb


def test_build_advisor_prompt_includes_kb_and_formatting():
    prompt = build_advisor_system_prompt("How does repayment work?", request_id=None)
    assert "KNOWLEDGE BASE" in prompt
    assert "Repayment history" in prompt
    assert "brief" in prompt.lower()
    assert "100 words" in prompt.lower()
    assert "USER PROFILE" in prompt


def test_build_advisor_prompt_with_profile():
    record = {
        "request_id": "abc-123",
        "score": 72,
        "risk_category": "LOW_RISK",
        "repayment_history_score": 70,
        "land_area_acres": 5,
        "crop_type": "maize",
        "annual_income_band": "2-5L",
        "reason_codes": ["moderate_repayment", "large_landholding", "mid_income_band", "medium_risk_crop"],
        "contributions": {
            "repayment_history": 22,
            "land_area": 25,
            "income_band": 15,
            "crop_risk": 10,
        },
        "risk_summary": "Sample summary.",
        "recommendations": ["Tip one"],
    }
    ctx = format_score_context(record)
    assert "72/100" in ctx
    assert "maize" in ctx

    prompt = build_advisor_system_prompt("Explain my score", request_id="missing-id")
    assert "KNOWLEDGE BASE" in prompt
