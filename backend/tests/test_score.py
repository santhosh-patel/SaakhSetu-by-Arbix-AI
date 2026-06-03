import re
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
    assert len(data["reason_codes"]) == 3
    assert all(isinstance(code, str) and code for code in data["reason_codes"])

    uuid.UUID(data["request_id"])
    assert re.match(r"^\d{4}-\d{2}-\d{2}T", data["timestamp"])


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
