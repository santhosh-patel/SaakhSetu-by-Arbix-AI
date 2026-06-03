# LLM Notes

## Example Prompts (paraphrased)

1. "Plan an end-to-end scoring app with FastAPI backend and React frontend — validation, audit logging, tests, and README requirements for a 90-minute exercise."

2. "Implement Pydantic schemas for land_area_acres, crop_type, repayment_history_score, and annual_income_band enum with proper 422 validation."

3. "Write a pure rule-based scoring function that returns a 0–100 score and exactly three reason codes from repayment, land, and income factors."

4. "Build a minimal React form that POSTs to /score, shows loading state, and displays validation errors from FastAPI 422 responses."

5. "Add pytest tests: one happy-path POST /score and several validation error cases."

## Something Improved After Review

The initial tool output used en-dash characters in income band enums (`2–5L`, `5–10L`). After review, these were changed to ASCII hyphens (`2-5L`, `5-10L`) so that:

- API consumers can type values from a standard keyboard
- Frontend `<select>` options match backend `IncomeBand` exactly
- curl examples and tests do not fail due to invisible Unicode differences

This is documented in README under Design Choices / Tradeoffs.
