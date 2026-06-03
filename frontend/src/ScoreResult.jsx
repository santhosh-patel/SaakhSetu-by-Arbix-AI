import { useEffect, useState } from "react";

function scoreClass(score) {
  if (score >= 60) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

function formatReasonCode(code) {
  return code.replace(/_/g, " ");
}

const FACTOR_CONFIG = [
  { key: "repayment_history", label: "Repayment", max: 35, weight: "35%" },
  { key: "land_area", label: "Land size", max: 25, weight: "25%" },
  { key: "income_band", label: "Income", max: 25, weight: "25%" },
  { key: "crop_risk", label: "Crop risk", max: 15, weight: "15%" },
];

export default function ScoreResult({ result, apiErrors, networkError, loading }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animateBars, setAnimateBars] = useState(false);
  const [prevResultId, setPrevResultId] = useState(null);

  if (result && result.request_id !== prevResultId) {
    setPrevResultId(result.request_id);
    setAnimateBars(false);
    setAnimatedScore(0);
  }

  useEffect(() => {
    if (result && !animateBars) {
      const timer = setTimeout(() => setAnimateBars(true), 50);
      return () => clearTimeout(timer);
    }
  }, [result, animateBars]);

  useEffect(() => {
    if (result && result.score !== undefined) {
      const duration = 750;
      const end = result.score;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress * (2 - progress);
        setAnimatedScore(Math.round(ease * end));
        if (progress < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    }
  }, [result]);

  if (loading) {
    return (
      <div className="result-panel loading-skeleton dashboard-skeleton">
        <div className="skeleton-hero">
          <div className="skeleton-circle"></div>
          <div className="skeleton-summary">
            <div className="skeleton-line-short"></div>
            <div className="skeleton-chips-row">
              <div className="skeleton-chip-item"></div>
              <div className="skeleton-chip-item"></div>
            </div>
          </div>
        </div>
        <div className="skeleton-factor-grid">
          <div className="skeleton-factor-card"></div>
          <div className="skeleton-factor-card"></div>
          <div className="skeleton-factor-card"></div>
          <div className="skeleton-factor-card"></div>
        </div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="result-panel status-error">
        <div className="status-icon">
          <svg className="status-svg warning" viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3>Service Unavailable</h3>
        <p className="status-msg">{networkError}</p>
        <p className="status-tip">Ensure the backend server is running on port 8000.</p>
      </div>
    );
  }

  if (apiErrors && apiErrors.length > 0) {
    return (
      <div className="result-panel status-error">
        <div className="status-icon">
          <svg className="status-svg error" viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h3>Validation Error</h3>
        <ul className="error-messages">
          {apiErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-panel empty-state">
        <div className="empty-icon">
          <svg className="empty-state-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="3"></circle>
            <line x1="12" y1="8" x2="12" y2="10"></line>
          </svg>
        </div>
        <h3>Awaiting Calculation</h3>
        <p>Enter farm parameters on the left to generate your credit score and insights.</p>
      </div>
    );
  }

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  const currentScoreClass = scoreClass(result.score);
  const contributions = result.contributions || {};

  return (
    <div className="result-panel success-panel">
      <div className="insights-dashboard">
        <header className="dashboard-hero">
          <div className="dashboard-score-block">
            <div className="score-visualization">
              <svg viewBox="0 0 100 100" className="score-circle-svg" aria-hidden="true">
                <circle cx="50" cy="50" r={radius} className="circle-track" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className={`circle-fill ${currentScoreClass}`}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <g className="circle-text-container">
                  <text x="50" y="46" textAnchor="middle" className="circle-score-number">
                    {animatedScore}
                  </text>
                  <text x="50" y="64" textAnchor="middle" className="circle-score-label">
                    / 100
                  </text>
                </g>
              </svg>
            </div>
            <p className="dashboard-score-caption">Credit score</p>
          </div>

          <div className="dashboard-summary-block">
            {result.risk_category && (
              <div className="summary-metric">
                <span className="summary-metric-label">Risk category</span>
                <span className={`risk-category-badge ${currentScoreClass}`}>
                  {result.risk_category.replace(/_/g, " ")}
                </span>
              </div>
            )}
            {result.reason_codes?.length > 0 && (
              <div className="summary-metric summary-metric--codes">
                <span className="summary-metric-label">Reason codes</span>
                <div className="reason-code-chips">
                  {result.reason_codes.map((code) => (
                    <span key={code} className={`factor-chip ${currentScoreClass}`}>
                      <span className="dot-indicator" />
                      {formatReasonCode(code)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="dashboard-section" aria-labelledby="breakdown-heading">
          <div className="dashboard-section-head">
            <h4 id="breakdown-heading" className="dashboard-section-title">
              Score breakdown
            </h4>
            <span className="dashboard-section-hint">Weighted factors</span>
          </div>
          <div className="factor-dashboard-grid">
            {FACTOR_CONFIG.map(({ key, label, max, weight }) => {
              const pts = contributions[key] ?? 0;
              const pct = (pts / max) * 100;
              return (
                <article key={key} className="factor-metric-card">
                  <div className="factor-metric-header">
                    <span className="factor-metric-name">{label}</span>
                    <span className="factor-metric-weight">{weight}</span>
                  </div>
                  <div className="factor-metric-value">
                    <span className={`factor-metric-pts ${currentScoreClass}`}>{pts}</span>
                    <span className="factor-metric-max">/ {max} pts</span>
                  </div>
                  <div className="bar-container bar-container--dashboard">
                    <div
                      className={`bar-fill ${currentScoreClass}`}
                      style={{ width: `${animateBars ? pct : 0}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {(result.risk_summary || result.recommendations?.length > 0) && (
          <section className="dashboard-section dashboard-insights-row" aria-labelledby="insights-heading">
            <h4 id="insights-heading" className="dashboard-section-title dashboard-section-title--solo">
              Insights
            </h4>
            <div className="insights-cards">
              {result.risk_summary && (
                <article className="insight-card">
                  <h5 className="insight-card-title">Risk summary</h5>
                  <p className="insight-card-body">{result.risk_summary}</p>
                </article>
              )}
              {result.recommendations?.length > 0 && (
                <article className="insight-card">
                  <h5 className="insight-card-title">Recommendations</h5>
                  <ul className="insight-list">
                    {result.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          </section>
        )}

        <details className="audit-details">
          <summary className="audit-details-summary">Audit reference</summary>
          <dl className="audit-details-list">
            <div className="audit-details-item">
              <dt>Reference ID</dt>
              <dd className="monospace">{result.request_id}</dd>
            </div>
            <div className="audit-details-item">
              <dt>Logged at</dt>
              <dd>{new Date(result.timestamp).toLocaleString()}</dd>
            </div>
            <div className="audit-details-item">
              <dt>Persistence</dt>
              <dd className="text-green">SQLite — recorded</dd>
            </div>
          </dl>
        </details>
      </div>
    </div>
  );
}
