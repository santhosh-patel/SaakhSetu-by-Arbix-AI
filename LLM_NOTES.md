# Phase 1 Release Plan

I have planned for the Phase 1 release of the application with the minimal core features of the API and a basic frontend. The planned scope includes:

1. **End-to-End Scoring App**: FastAPI backend and React frontend with validation, structured audit logging, tests, and setup documentation.
2. **Input Validation**: Pydantic schemas for `land_area_acres`, `crop_type`, `repayment_history_score`, and `annual_income_band` enum with proper 422 error response formatting.
3. **Rule-Based Scoring**: A pure rule-based scoring function returning a 0–100 score and exactly three explainability reason codes from repayment, land, and income factors.
4. **Minimal Frontend UI**: React form that POSTs to `/score`, shows loading/disabled states, and displays validation errors from FastAPI 422 responses.
5. **Testing**: Pytest cases covering happy-path scoring and various validation error scenarios.

## Something Improved After Review

The initial tool output used en-dash characters in income band enums (`2–5L`, `5–10L`). After review, these were changed to ASCII hyphens (`2-5L`, `5-10L`) so that:

- API consumers can type values from a standard keyboard
- Frontend `<select>` options match backend `IncomeBand` exactly
- curl examples and tests do not fail due to invisible Unicode differences

This is documented in README under Design Choices / Tradeoffs.
