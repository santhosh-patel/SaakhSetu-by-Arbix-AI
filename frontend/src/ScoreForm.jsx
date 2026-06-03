import { useState } from "react";

const INCOME_BANDS = ["<2L", "2-5L", "5-10L", ">10L"];

const TELANGANA_CROPS = [
  { value: "paddy", label: "Paddy (Rice)" },
  { value: "cotton", label: "Cotton" },
  { value: "maize", label: "Maize" },
  { value: "red gram", label: "Red Gram" },
  { value: "turmeric", label: "Turmeric" },
  { value: "groundnut", label: "Groundnut" },
  { value: "chillies", label: "Chillies" },
  { value: "soybean", label: "Soybean" },
  { value: "sugarcane", label: "Sugarcane" },
  { value: "green gram", label: "Green Gram" },
];

const INITIAL = {
  land_area_acres: "",
  crop_type: "paddy", // Default to Paddy (Rice)
  repayment_history_score: "70",
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
    <form className="calculator-form" onSubmit={handleSubmit}>
      {/* Land Area */}
      <div className="form-field">
        <label htmlFor="land_area_acres">
          <span>Land Area</span>
          <span className="label-hint">Acres</span>
        </label>
        <input
          id="land_area_acres"
          name="land_area_acres"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="e.g. 2.5"
          value={form.land_area_acres}
          onChange={handleChange}
          disabled={loading}
          required
        />
      </div>

      {/* Crop Type (Telangana Crops Dropdown) */}
      <div className="form-field">
        <label htmlFor="crop_type">
          <span>Crop Type</span>
          <span className="label-hint">Telangana Top Crops</span>
        </label>
        <select
          id="crop_type"
          name="crop_type"
          value={form.crop_type}
          onChange={handleChange}
          disabled={loading}
        >
          {TELANGANA_CROPS.map((crop) => (
            <option key={crop.value} value={crop.value}>
              {crop.label}
            </option>
          ))}
        </select>
      </div>

      {/* Repayment History Score */}
      <div className="form-field">
        <div className="slider-label-row">
          <label htmlFor="repayment_history_score">Repayment Score</label>
          <span className="slider-value">{form.repayment_history_score} / 100</span>
        </div>
        <input
          id="repayment_history_score"
          name="repayment_history_score"
          type="range"
          min="0"
          max="100"
          step="1"
          value={form.repayment_history_score}
          onChange={handleChange}
          disabled={loading}
          className="slider-input"
        />
        <div className="slider-ticks">
          <span>Weak</span>
          <span>Moderate</span>
          <span>Strong</span>
        </div>
      </div>

      {/* Annual Income Band */}
      <div className="form-field">
        <label htmlFor="annual_income_band">
          <span>Annual Income Band</span>
          <span className="label-hint">In Lakhs (INR)</span>
        </label>
        <select
          id="annual_income_band"
          name="annual_income_band"
          value={form.annual_income_band}
          onChange={handleChange}
          disabled={loading}
        >
          {INCOME_BANDS.map((band) => (
            <option key={band} value={band}>
              {band} Lakhs
            </option>
          ))}
        </select>
      </div>

      {clientErrors.length > 0 && (
        <div className="error-alert">
          <ul className="error-ul">
            {clientErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? (
          <span className="loading-row">
            <span className="loading-spinner"></span>
            Scoring...
          </span>
        ) : (
          <span>Calculate Credit Score</span>
        )}
      </button>
    </form>
  );
}
