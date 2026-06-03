import { useState } from "react";
import { submitScore } from "./api";
import ScoreForm from "./ScoreForm";
import ScoreResult, { formatApiErrors } from "./ScoreResult";
import "./App.css";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiErrors, setApiErrors] = useState([]);
  const [networkError, setNetworkError] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setResult(null);
    setApiErrors([]);
    setNetworkError(null);

    try {
      const data = await submitScore(formData);
      setResult(data);
    } catch (err) {
      if (err.status === 422 && err.detail) {
        setApiErrors(formatApiErrors(err.detail));
      } else if (err.message) {
        setNetworkError(err.message);
      } else {
        setNetworkError("Unable to reach the scoring service. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Background soft mesh gradients */}
      <div className="bg-mesh bg-mesh-1"></div>
      <div className="bg-mesh bg-mesh-2"></div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-logo">
          <img src="/logo.png" alt="SaakhSetu" className="logo-img" />
        </div>
      </nav>

      {/* Hero Header */}
      <header className="hero">
        <h1 className="hero-title">Agricultural Credit Scoring</h1>
        <p className="hero-subtitle">
          Evaluate farmer creditworthiness instantly with a fully explainable credit scoring engine.
        </p>
      </header>

      {/* Interactive Scoring Card Grid */}
      <main className="main-content">
        <div className="glass-card calculator-grid">
          <div className="grid-col form-col">
            <ScoreForm onSubmit={handleSubmit} loading={loading} />
          </div>
          <div className="grid-col result-col">
            <ScoreResult
              result={result}
              apiErrors={apiErrors}
              networkError={networkError}
              loading={loading}
            />
          </div>
        </div>

        {/* Elegant Explanation & How it Works Section */}
        <section className="info-section">
          <div className="info-block">
            <h2>About SaakhSetu</h2>
            <p>
              SaakhSetu is an agricultural credit assessment platform designed for financial institutions. It evaluates land size, crop types, repayment histories, and income bands to compute a transparent, data-driven credit score. This assists lenders in making rapid and robust underwriting decisions.
            </p>
          </div>

          <div className="info-block">
            <h2>How It Works</h2>
            <div className="info-steps">
              <div className="info-step">
                <h3>1. Parameter Inputs</h3>
                <p> Lenders input verified farm data including land acreage, crop choices, repayment histories, and income brackets.</p>
              </div>
              <div className="info-step">
                <h3>2. Weighted Scoring</h3>
                <p>The system calculates credit ratings using explicit rule-based weights: Repayment History (35%), Land Size (25%), Income Band (25%), and Crop Risk (15%).</p>
              </div>
              <div className="info-step">
                <h3>3. Decision Transparency</h3>
                <p>To eliminate black-box scoring, each calculation returns four distinct reason codes outlining precisely why the score was set.</p>
              </div>
              <div className="info-step">
                <h3>4. SQLite Audit Trails</h3>
                <p>Every evaluation is logged locally in an isolated database to maintain secure, compliant histories for external audits.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 SaakhSetu. Transparent & explainable credit decisions.</p>
      </footer>
    </div>
  );
}
