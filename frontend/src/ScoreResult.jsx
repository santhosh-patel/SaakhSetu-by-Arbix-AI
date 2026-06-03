import { useEffect, useState } from "react";

function scoreClass(score) {
  if (score >= 60) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

export function formatApiErrors(detail) {
  if (!detail) return ["Request failed. Please try again."];
  if (typeof detail === "string") return [detail];
  if (Array.isArray(detail)) {
    return detail.map((err) => {
      const field = err.loc ? err.loc.filter((p) => p !== "body").join(".") : "";
      const msg = err.msg || JSON.stringify(err);
      return field ? `${field}: ${msg}` : msg;
    });
  }
  return ["Request failed. Please try again."];
}

export default function ScoreResult({ result, apiErrors, networkError, loading }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score counting up
  useEffect(() => {
    if (result && result.score !== undefined) {
      setAnimatedScore(0);
      const duration = 750; // ms
      const start = 0;
      const end = result.score;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress * (2 - progress); // outQuad
        const currentVal = Math.round(start + ease * (end - start));
        
        setAnimatedScore(currentVal);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [result]);

  if (loading) {
    return (
      <div className="result-panel loading-skeleton">
        <div className="skeleton-circle"></div>
        <div className="skeleton-line-short"></div>
        <div className="skeleton-chips-row">
          <div className="skeleton-chip-item"></div>
          <div className="skeleton-chip-item"></div>
          <div className="skeleton-chip-item"></div>
        </div>
        <div className="skeleton-line-long"></div>
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="result-panel status-error">
        <div className="status-icon">⚠️</div>
        <h3>Service Unavailable</h3>
        <p className="status-msg">{networkError}</p>
        <p className="status-tip">Ensure the backend server is running on port 8000.</p>
      </div>
    );
  }

  if (apiErrors && apiErrors.length > 0) {
    return (
      <div className="result-panel status-error">
        <div className="status-icon">❌</div>
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
        <div className="empty-icon">🌾</div>
        <h3>Awaiting Calculation</h3>
        <p>
          Provide the farming parameters on the left to compute the credit score.
        </p>
      </div>
    );
  }

  // Circle path variables
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;
  const currentScoreClass = scoreClass(result.score);

  return (
    <div className="result-panel success-panel">
      {/* Circle Score Indicator */}
      <div className="score-visualization">
        <svg viewBox="0 0 100 100" className="score-circle-svg">
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
            <text x="50" y="47" textAnchor="middle" className="circle-score-number">{animatedScore}</text>
            <text x="50" y="65" textAnchor="middle" className="circle-score-label">Credit Score</text>
          </g>
        </svg>
      </div>

      {/* Explainable Factor Details */}
      <div className="explanation-section-block">
        <h4 className="detail-title">Score Attribution</h4>
        <div className="factor-chips-container">
          {result.reason_codes.map((code) => (
            <div key={code} className={`factor-chip ${currentScoreClass}`}>
              <span className="dot-indicator"></span>
              <span className="factor-code-name">{code}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="audit-ledger-block">
        <h4 className="detail-title">Audit Log Trail</h4>
        <div className="meta-table">
          <div className="meta-table-row">
            <span className="meta-key">Reference ID</span>
            <span className="meta-val monospace">{result.request_id}</span>
          </div>
          <div className="meta-table-row">
            <span className="meta-key">Logged At</span>
            <span className="meta-val">{new Date(result.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="meta-table-row">
            <span className="meta-key">SQLite Write</span>
            <span className="meta-val text-green">Success</span>
          </div>
        </div>
      </div>
    </div>
  );
}
