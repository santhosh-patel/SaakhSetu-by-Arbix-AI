# Release Plan

## Phase 1 — Minimal Core API & Frontend

I planned for the Phase 1 release of the application with the minimal core features of the API and a basic frontend. The scope included:

1. **MVP of Scoring App**: FastAPI backend and React frontend with validation, structured audit logging, tests, and setup documentation.
2. **Input Validation**: Pydantic schemas for `land_area_acres`, `crop_type`, `repayment_history_score`, and `annual_income_band` enum with proper 422 error response formatting.
3. **Rule-Based Scoring**: A pure rule-based scoring function returning a 0–100 score and exactly three explainability reason codes from repayment, land, and income factors.
4. **Minimal Frontend UI**: React form that POSTs to `/score`, shows loading/disabled states, and displays validation errors from FastAPI 422 responses.
5. **Testing**: 5 pytest cases covering happy-path scoring and various validation error scenarios.

## Phase 2 — SQLite Persistence & Enhanced Scoring

Phase 2 adds database-backed audit logging and incorporates crop type as a scoring factor:

1. **SQLite Audit Persistence**: Every scoring request and response is persisted to a SQLite database (`saakhsetu.db`). Database path is configurable via the `SAAKHSETU_DB_PATH` environment variable. The database is auto-initialized on server startup using a FastAPI lifespan handler.
2. **Enhanced Scoring with Crop Risk**: Crop type is now classified into three risk tiers (low/medium/high) that contribute up to 15 points. Scoring weights were redistributed: Repayment (35), Land (25), Income (25), Crop Risk (15). The response now includes 4 reason codes instead of 3.
3. **Expanded Tests**: 9 pytest test cases including crop risk tier verification (low, medium, high) and SQLite audit persistence validation.

## Design Decisions

### Income Band Encoding

The initial tool output used en-dash characters in income band enums (`2–5L`, `5–10L`). After review, these were changed to ASCII hyphens (`2-5L`, `5-10L`) so that:

- API consumers can type values from a standard keyboard
- Frontend `<select>` options match backend `IncomeBand` exactly
- curl examples and tests do not fail due to invisible Unicode differences

### Crop Risk as Static Lookup

Crop risk classification uses a hardcoded set of known crops rather than a database-driven configuration. This keeps the scoring function pure and testable without external dependencies. Unknown crops default to high-risk (5 pts) as a conservative fallback.

### SQLite over Postgres

SQLite was chosen for audit persistence because it requires zero external infrastructure, is built into Python's standard library, and is sufficient for single-instance deployments. The `SAAKHSETU_DB_PATH` env var allows test isolation by pointing to a separate file.

