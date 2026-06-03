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
