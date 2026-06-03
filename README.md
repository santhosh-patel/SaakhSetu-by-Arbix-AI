# SaakhSetu — Agricultural Credit Scoring

Rule-based credit scoring API with a minimal React frontend. Accepts land, crop, repayment, and income inputs; returns a 0–100 score with four explainability reason codes, crop-type risk classification, and SQLite-backed audit logging.

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
| Reason codes | Exactly 4, one per factor | Repayment, land, income, and crop risk each contribute one code |
| Audit log | Dual: JSON to stdout + SQLite | Structured console output for dev; persistent DB for history |
| Income bands | ASCII hyphens (`2-5L`, `5-10L`) | Practical keyboard/API input; spec shows en-dashes but ASCII avoids copy-paste issues |
| `crop_type` | Scored via risk tier (low/medium/high) | Low-risk staples (wheat, rice) score higher; unknown crops default to high-risk |
| Persistence | SQLite (`saakhsetu.db`) | Lightweight, zero-config; configurable via `SAAKHSETU_DB_PATH` env var |

## Scoring Weights

| Factor | Max Points | Tiers |
|--------|-----------|-------|
| Repayment history | 35 | ≥80 → 35, ≥50 → 22, <50 → 10 |
| Land area (acres) | 25 | ≥5 → 25, ≥1 → 18, <1 → 8 |
| Annual income band | 25 | >10L → 25, 5-10L → 20, 2-5L → 15, <2L → 8 |
| Crop risk | 15 | Low → 15, Medium → 10, High → 5 |

**Crop Risk Classification:**

- **Low risk**: wheat, paddy, rice, barley, ragi, jowar
- **Medium risk**: maize, mustard, cotton, soybean, groundnut
- **High risk**: all other crops

## Tradeoffs

- **SQLite over Postgres** — zero external dependencies; sufficient for single-instance use.
- **Crop risk as static lookup** — simple and transparent; can be upgraded to a data-driven model later.
- **ASCII vs en-dash income bands** — documented; frontend and backend use the same enum values.
- **No Docker** — deferred to a future phase.

## Release History

### Phase 3 (current)

- **AI Risk Summaries & Recommendations**: Rule-based generation of short risk summaries and actionable recommendations returned on every score calculation.
- **JSON Data Persistence**: Created JSON history (`history.json`) and audit log (`audit_logs.json`) stores with corresponding HTTP retrieval endpoints.
- **AI Credit Advisor Chatbot**: Floating chatbot widget in the bottom-right corner powered by Llama 3 8B on Groq, dynamically loading calculated credit profiles for personalized advice.
- **Multi-Tab Layout**: Tabbed views inside the main card container separating the Calculator, Scores History (supporting click-to-inspect), and Audit Logs.

### Phase 2

- **SQLite Audit Persistence**: Every scoring request is persisted to `saakhsetu.db` (configurable via `SAAKHSETU_DB_PATH`).
- **Enhanced Scoring**: Crop type risk factor incorporated as a 4th scoring dimension (15 pts max).
- **Dribbble Light Theme**: Re-styled to a clean warm clay aesthetic with an enlarged 175px credit score gauge and a dropdown select for Telangana's top 10 crops.
- **Score Explainability Dashboard**: Interactive horizontal progress bars showing points contributions, animated with CSS slide transitions.
- **Advanced Slider Controls**: Enlarged the repayment history slider input and added a synced manual numeric input box.
- **Expanded Tests**: 9 pytest cases including crop risk tier tests and SQLite audit verification.

### Phase 1

- **API Endpoint (`POST /score`)**: FastAPI + Pydantic v2 with input validation and rule-based credit scoring.
- **Audit Logging**: Structured JSON logging to stdout.
- **Testing**: 5 pytest cases (happy path + validation errors).
- **Basic Frontend**: React form with loading state and error handling.
- **Documentation**: Setup guides and design tradeoff notes.

**Personally verified:**

- Ran `pytest -v` — all 9 tests pass
- Confirmed crop risk reason codes: `low_risk_crop` (wheat), `medium_risk_crop` (cotton), `high_risk_crop` (sugarcane)
- Verified SQLite audit records match API response data
- Confirmed Pydantic returns 422 for invalid land area, empty crop, bad income band, repayment out of range
- Reviewed audit log payload — only the four scoring fields plus outputs; no PII
