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

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — ensure the backend is running on port 8000.

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
| Persistence | None | Time-box focus on core requirements |

## Tradeoffs

- **No database** — audit logs go to stdout only; sufficient for the exercise.
- **crop_type not in score** — keeps exactly three reason codes from the three weighted factors.
- **ASCII vs en-dash income bands** — documented; frontend and backend use the same enum values.
- **No Docker** — skipped to complete tests and frontend within time-box.

## Time-box (IST)

| | |
|---|---|
| **Start** | 2026-06-03 ~19:00 IST |
| **End** | 2026-06-03 ~20:30 IST |
| **Approx. total** | ~90 minutes |

### Completed

- `POST /score` with validation, rule-based scoring, 3 reason codes
- Structured audit logging
- 5 pytest cases (happy path + validation errors)
- React form, loading state, client + server error handling
- README and LLM_NOTES

### Skipped

- Docker / docker-compose
- SQLite persistence
- Drift-check endpoint
- Linting/formatting setup (ruff, prettier)

## What I Would Do With 2 More Hours

1. SQLite audit persistence with a simple `score_requests` table
2. `docker-compose.yml` for one-command local run
3. Playwright e2e test (form submit → score displayed)
4. `crop_type` factor in scoring (e.g. cash crop vs food crop)
5. GitHub Actions CI running pytest on push

## LLM / Tool Disclosure

| Tool | Usage |
|------|-------|
| Cursor (Composer) | Scaffolded project structure, backend modules, frontend components, tests, and docs from the exercise spec |

**Personally verified:**

- Ran `pytest -v` — all 5 tests pass
- Confirmed Pydantic returns 422 for invalid land area, empty crop, bad income band, repayment out of range
- Checked income band enum values match between frontend `<select>` and backend `IncomeBand`
- Reviewed audit log payload — only the four scoring fields plus outputs; no PII
- Corrected frontend error handling to parse FastAPI `detail` array format
