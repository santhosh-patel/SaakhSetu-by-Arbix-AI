import { useState } from "react";

const INCOME_BANDS = ["<2L", "2-5L", "5-10L", ">10L"];

const INITIAL = {
  land_area_acres: "",
  crop_type: "",
  repayment_history_score: "",
  annual_income_band: "2-5L",
};

export function validateForm(form) {
  const errors = [];

  const land = parseFloat(form.land_area_acres);
  if (isNaN(land) || land <= 0) {
    errors.push("Land area must be a positive number.");
  }

  if (!form.crop_type.trim()) {
    errors.push("Crop type is required.");
  }

  const repayment = parseFloat(form.repayment_history_score);
  if (isNaN(repayment) || repayment < 0 || repayment > 100) {
    errors.push("Repayment history score must be between 0 and 100.");
  }

  if (!INCOME_BANDS.includes(form.annual_income_band)) {
    errors.push("Please select a valid income band.");
  }

  return errors;
}

export default function ScoreForm({ onSubmit, loading }) {
  const [form, setForm] = useState(INITIAL);
  const [clientErrors, setClientErrors] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setClientErrors([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }

    onSubmit({
      land_area_acres: parseFloat(form.land_area_acres),
      crop_type: form.crop_type.trim(),
      repayment_history_score: parseFloat(form.repayment_history_score),
      annual_income_band: form.annual_income_band,
    });
  };

  return (
    <form className="score-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="land_area_acres">Land Area (acres)</label>
        <input
          id="land_area_acres"
          name="land_area_acres"
          type="number"
          min="0.01"
          step="0.01"
          value={form.land_area_acres}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="crop_type">Crop Type</label>
        <input
          id="crop_type"
          name="crop_type"
          type="text"
          value={form.crop_type}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="repayment_history_score">Repayment History Score (0-100)</label>
        <input
          id="repayment_history_score"
          name="repayment_history_score"
          type="number"
          min="0"
          max="100"
          step="1"
          value={form.repayment_history_score}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="annual_income_band">Annual Income Band</label>
        <select
          id="annual_income_band"
          name="annual_income_band"
          value={form.annual_income_band}
          onChange={handleChange}
          disabled={loading}
        >
          {INCOME_BANDS.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </div>

      {clientErrors.length > 0 && (
        <ul className="error-list">
          {clientErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "Scoring..." : "Calculate Score"}
      </button>
    </form>
  );
}
