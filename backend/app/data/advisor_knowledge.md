# SaakhSetu Advisor Knowledge Base

## Product overview

SaakhSetu is an **agricultural credit scoring** platform for lenders and farmers in India (Telangana-focused crop list in the UI). It provides:

- Rule-based credit scores from **0 to 100**
- **Four explainability reason codes** (one per scoring factor)
- **Risk category**: LOW_RISK, MEDIUM_RISK, or HIGH_RISK
- **Risk summary** and **recommendations** on every calculation
- **SQLite audit persistence** and JSON history/audit endpoints
- **AI Credit Advisor** chat (Groq) for explanations — answers must follow this knowledge base

The engine is **transparent and rule-based** (not a black-box ML model). Scores cannot be changed via chat.

---

## Scoring model (total max 100 points)

| Factor | Max points | How it is calculated |
|--------|------------|----------------------|
| Repayment history | 35 | Input score 0–100 mapped to tiers |
| Land area (acres) | 25 | Based on acreage thresholds |
| Annual income band | 25 | Based on selected income band enum |
| Crop risk | 15 | Based on crop type risk tier |

**Final score** = sum of four factors, clamped to 0–100.

### Repayment history (max 35)

| Input repayment score | Points | Reason code |
|----------------------|--------|-------------|
| ≥ 80 | 35 | good_repayment |
| ≥ 50 and < 80 | 22 | moderate_repayment |
| < 50 | 10 | weak_repayment |

### Land area in acres (max 25)

| Acres | Points | Reason code |
|-------|--------|-------------|
| ≥ 5 | 25 | large_landholding |
| ≥ 1 and < 5 | 18 | mid_landholding |
| < 1 | 8 | small_landholding |

Land area must be **> 0** (validation error otherwise).

### Annual income band (max 25)

Use **ASCII hyphens** exactly: `<2L`, `2-5L`, `5-10L`, `>10L` (not en-dash).

| Band | Points | Reason code |
|------|--------|-------------|
| >10L | 25 | high_income_band |
| 5-10L | 20 | upper_mid_income_band |
| 2-5L | 15 | mid_income_band |
| <2L | 8 | low_income_band |

### Crop risk (max 15)

Crop type is **case-insensitive** after trimming.

| Tier | Points | Reason code | Crops |
|------|--------|-------------|-------|
| Low risk | 15 | low_risk_crop | wheat, paddy, rice, barley, ragi, jowar |
| Medium risk | 10 | medium_risk_crop | maize, mustard, cotton, soybean, groundnut |
| High risk | 5 | high_risk_crop | **any other crop** (e.g. sugarcane, turmeric, chillies, red gram, green gram) |

---

## Risk categories

| Score range | Category | Meaning |
|-------------|----------|---------|
| 60–100 | LOW_RISK | Favorable lending profile |
| 40–59 | MEDIUM_RISK | Standard caution |
| 0–39 | HIGH_RISK | Higher risk; may need mitigants |

Display format: `LOW_RISK` → "LOW RISK" (underscore replaced in UI).

---

## Reason codes glossary

Each calculation returns **exactly four** reason codes — one from each factor.

| Code | Factor | Meaning |
|------|--------|---------|
| good_repayment | Repayment | Strong repayment history (≥80 input) |
| moderate_repayment | Repayment | Moderate repayment (50–79 input) |
| weak_repayment | Repayment | Weak repayment (<50 input) |
| large_landholding | Land | ≥5 acres |
| mid_landholding | Land | 1–4.99 acres |
| small_landholding | Land | <1 acre |
| high_income_band | Income | Band >10L |
| upper_mid_income_band | Income | Band 5-10L |
| mid_income_band | Income | Band 2-5L |
| low_income_band | Income | Band <2L |
| low_risk_crop | Crop | Staple / low-risk crop |
| medium_risk_crop | Crop | Medium-risk crop |
| high_risk_crop | Crop | Unknown or high-risk crop |

---

## Recommendations (rule-based)

Up to **3** recommendations are chosen from reason codes:

| Trigger reason code | Typical recommendation theme |
|--------------------|------------------------------|
| weak_repayment | Timely repayment of future obligations |
| moderate_repayment | Clear past dues early |
| small_landholding | Cooperative farming / joint liability |
| mid_landholding | Register and document land deeds |
| low_income_band | Route sales through formal bank accounts |
| mid_income_band | Keep digital transaction records |
| high_risk_crop | Diversify toward wheat/paddy |
| medium_risk_crop | Crop insurance for volatility |

Generic fallbacks may include clean credit record and documented receipts.

---

## API inputs and validation

**POST /score** body:

- `land_area_acres`: number, must be **> 0**
- `crop_type`: non-empty string
- `repayment_history_score`: number **0–100** inclusive
- `annual_income_band`: one of `<2L`, `2-5L`, `5-10L`, `>10L`

Invalid inputs return **422** with Pydantic detail array.

**Response includes**: request_id, score, reason_codes, contributions (per-factor points), risk_category, risk_summary, recommendations, timestamp.

---

## Contributions object

Returned under `contributions` for dashboard bars:

- `repayment_history`: points earned (max 35)
- `land_area`: points earned (max 25)
- `income_band`: points earned (max 25)
- `crop_risk`: points earned (max 15)

---

## Other API endpoints

| Endpoint | Purpose |
|----------|---------|
| GET /health | Service status |
| GET /scores | List score history (request_id, timestamp, score) |
| GET /scores/{request_id} | Full record for one calculation |
| GET /audit-logs | Audit trail list |
| POST /chat | AI advisor (message, optional request_id for profile context) |

Backend default: `http://localhost:8000`. Frontend default: `http://localhost:5173`.

---

## Using the application

1. Open **Score Calculator** tab → enter land, crop, repayment slider (0–100), income band.
2. Submit → right panel shows score gauge, breakdown, insights, audit reference.
3. **Score History** tab → past runs; **Inspect** loads that profile into calculator + advisor.
4. **Audit Logs** tab → tabular audit view.
5. **Credit Advisor** (floating button) → ask about scores; link profile via latest calculation or inspect.

---

## AI Credit Advisor rules

- Uses Groq models: primary `llama-3.1-8b-instant`, fallback `llama-3.3-70b-versatile`
- Requires `GROQ_API_KEY` on the server (never in frontend)
- Max message length: **250 characters**
- Rate limit: **30 queries per IP per 24 hours**
- With `request_id`: loads profile from audit logs for personalized answers
- Must **not** change scores or invent financial data not in context
- Answers should be **brief, simple, and elegant** — light Markdown (bold, short bullets; small tables only when comparing several factors)

---

## FAQ

**Why is my score low?**  
Check which factor earned the fewest points: weak repayment, small land, low income band, or high-risk crop.

**How can I improve my score?**  
Improve repayment input over time, increase documented land/income, choose lower-risk staples where appropriate, follow recommendations list.

**Does crop type affect the score?**  
Yes — up to 15 points via crop risk tier.

**Is this a loan approval?**  
No — it is a **decision support** score; lenders make final calls.

**What data is stored?**  
Agricultural scoring fields and results in SQLite + JSON logs — no PII beyond what the user enters in the form.

**Unknown crop?**  
Treated as **high_risk_crop** (5 points) — conservative default.
