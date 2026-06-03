import json
import re
import sqlite3
import uuid

VALID_PAYLOAD = {
    "land_area_acres": 2.5,
    "crop_type": "wheat",
    "repayment_history_score": 75,
    "annual_income_band": "2-5L",
}


def test_score_happy_path(client):
    response = client.post("/score", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()

    assert 0 <= data["score"] <= 100
    assert len(data["reason_codes"]) == 4
    assert all(isinstance(code, str) and code for code in data["reason_codes"])

    # Verify crop risk reason code is present
    crop_reasons = {"low_risk_crop", "medium_risk_crop", "high_risk_crop"}
    assert any(code in crop_reasons for code in data["reason_codes"])

    assert "contributions" in data
    contrib = data["contributions"]
    assert "repayment_history" in contrib
    assert "land_area" in contrib
    assert "income_band" in contrib
    assert "crop_risk" in contrib
    assert sum(contrib.values()) == data["score"]

    uuid.UUID(data["request_id"])
    assert re.match(r"^\d{4}-\d{2}-\d{2}T", data["timestamp"])


def test_score_low_risk_crop(client):
    """Wheat is classified as low-risk and should yield low_risk_crop reason."""
    payload = {**VALID_PAYLOAD, "crop_type": "wheat"}
    response = client.post("/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "low_risk_crop" in data["reason_codes"]


def test_score_medium_risk_crop(client):
    """Cotton is classified as medium-risk."""
    payload = {**VALID_PAYLOAD, "crop_type": "cotton"}
    response = client.post("/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "medium_risk_crop" in data["reason_codes"]


def test_score_high_risk_crop(client):
    """Unknown/other crops are classified as high-risk."""
    payload = {**VALID_PAYLOAD, "crop_type": "sugarcane"}
    response = client.post("/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "high_risk_crop" in data["reason_codes"]


def test_score_negative_land_area(client):
    payload = {**VALID_PAYLOAD, "land_area_acres": -1}
    response = client.post("/score", json=payload)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert any("land_area_acres" in str(err.get("loc", [])) for err in detail)


def test_score_empty_crop_type(client):
    payload = {**VALID_PAYLOAD, "crop_type": "   "}
    response = client.post("/score", json=payload)
    assert response.status_code == 422


def test_score_invalid_income_band(client):
    payload = {**VALID_PAYLOAD, "annual_income_band": "invalid"}
    response = client.post("/score", json=payload)
    assert response.status_code == 422


def test_score_repayment_out_of_range(client):
    payload = {**VALID_PAYLOAD, "repayment_history_score": 101}
    response = client.post("/score", json=payload)
    assert response.status_code == 422


def test_audit_persisted_to_sqlite(client):
    """Verify that a scoring request creates a row in the audit_logs table."""
    import os

    db_path = os.environ["SAAKHSETU_DB_PATH"]

    # Count rows before
    conn = sqlite3.connect(db_path)
    before = conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]
    conn.close()

    # Make a scoring request
    response = client.post("/score", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()

    # Count rows after
    conn = sqlite3.connect(db_path)
    after = conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0]

    # Verify the latest row matches
    row = conn.execute(
        "SELECT request_id, crop_type, score, reason_codes, contributions FROM audit_logs ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()

    assert after == before + 1
    assert row[0] == data["request_id"]
    assert row[1] == VALID_PAYLOAD["crop_type"]
    assert row[2] == data["score"]

    stored_reasons = json.loads(row[3])
    assert stored_reasons == data["reason_codes"]

    stored_contrib = json.loads(row[4])
    assert stored_contrib == data["contributions"]


def test_history_and_audit_endpoints(client):
    # Make a post
    response = client.post("/score", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    req_id = data["request_id"]

    # Test GET /scores
    resp_scores = client.get("/scores")
    assert resp_scores.status_code == 200
    scores_list = resp_scores.json()
    assert len(scores_list) > 0
    assert any(item["request_id"] == req_id for item in scores_list)

    # Test GET /scores/{request_id}
    resp_detail = client.get(f"/scores/{req_id}")
    assert resp_detail.status_code == 200
    detail = resp_detail.json()
    assert detail["request_id"] == req_id
    assert detail["score"] == data["score"]
    assert "risk_category" in detail
    assert "risk_summary" in detail
    assert "recommendations" in detail

    # Test GET /audit-logs
    resp_audit = client.get("/audit-logs")
    assert resp_audit.status_code == 200
    audit_list = resp_audit.json()
    assert len(audit_list) > 0
    assert any(log["request_id"] == req_id for log in audit_list)


def test_chat_without_api_key(client, monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    resp = client.post("/chat", json={"message": "Hello"})
    assert resp.status_code == 200
    assert "Advisor is offline" in resp.json()["response"]


def test_chat_input_length_guardrail(client):
    long_message = "A" * 251
    resp = client.post("/chat", json={"message": long_message})
    assert resp.status_code == 200
    assert "too long" in resp.json()["response"]


def test_chat_rate_limiting(client, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "dummy_key")
    class MockResponse:
        status_code = 200
        def json(self):
            return {"choices": [{"message": {"content": "Mock Bot Answer"}}]}
    
    async def mock_post(*args, **kwargs):
        return MockResponse()

    import httpx
    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    from app.main import chat_rate_limits
    chat_rate_limits.clear()

    for _ in range(30):
        resp = client.post("/chat", json={"message": "Hello"})
        assert resp.status_code == 200
        assert resp.json()["response"] == "Mock Bot Answer"

    resp = client.post("/chat", json={"message": "Hello"})
    assert resp.status_code == 200
    assert "Daily query limit reached" in resp.json()["response"]
