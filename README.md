# SaakhSetu — Agricultural Credit Scoring

Rule-based credit scoring API with a minimal React frontend. Accepts land, crop, repayment, and income inputs; returns a 0–100 score with three explainability reason codes and structured audit logging.

## Run Instructions

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> — ensure the backend is running on port 8000.

### Tests

```bash
cd backend
source .venv/bin/activate
pytest -v
```

### Example API call

```bash
curl -s -X POST http://localhost:8000/score \
  -H "Content-Type: application/json" \
  -d '{
    "land_area_acres": 2.5,
    "crop_type": "wheat",
    "repayment_history_score": 75,
    "annual_income_band": "2-5L"
  }' | python3 -m json.tool
```

## Design Choices

| Area | Choice | Rationale |
|------|--------|-----------|
| Framework | FastAPI + Pydantic v2 | Automatic 422 validation, OpenAPI docs, minimal boilerplate |
| Scoring | Pure module (`scoring.py`) | Testable without HTTP; easy to swap for ML later |
| Reason codes | Exactly 3, one per factor | Matches spec; repayment, land, income each contribute one code |
| Audit log | Structured JSON to stdout | Meets spec without DB complexity; safe for non-PII agricultural fields |
| Income bands | ASCII hyphens (`2-5L`, `5-10L`) | Practical keyboard/API input; spec shows en-dashes but ASCII avoids copy-paste issues |
| `crop_type` | Validated, not scored | Accepted per spec; extension point for crop-risk rules |
| Persistence | None | Focus on core Phase 1 requirements |

## Tradeoffs

- **No database** — audit logs go to stdout only; sufficient for Phase 1.
- **crop_type not in score** — keeps exactly three reason codes from the three weighted factors.
- **ASCII vs en-dash income bands** — documented; frontend and backend use the same enum values.
- **No Docker** — deferred beyond Phase 1 scope.

## Phase 1 Release Plan

This repository contains the Phase 1 release of the application featuring the minimal core API features and a basic frontend.

### Completed Scope

- **API Endpoint (`POST /score`)**: Web service built with FastAPI and Pydantic v2 incorporating input validation, rule-based credit scoring, and exactly three reason codes.
- **Audit Logging**: Structured JSON logging to stdout for tracking score evaluations.
- **Testing**: 5 pytest test cases verifying successful scoring and detailed input validation error states.
- **Basic Frontend**: A clean React form showing loading/submitting state and backend validation errors.
- **Documentation**: Simple setup, run guides, and design tradeoff notes.

## Future Roadmap / Phase 2 Planning

1. **SQLite Audit Persistence**: Store credit scoring request and response history in a database.
2. **Enhanced Scoring**: Incorporate crop type risk factors into the overall credit score model.

**Personally verified:**

- Ran `pytest -v` — all 5 tests pass
- Confirmed Pydantic returns 422 for invalid land area, empty crop, bad income band, repayment out of range
- Checked income band enum values match between frontend `<select>` and backend `IncomeBand`
- Reviewed audit log payload — only the four scoring fields plus outputs; no PII
- Corrected frontend error handling to parse FastAPI `detail` array format
