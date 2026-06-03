import { useEffect, useState } from "react";

function scoreClass(score) {
  if (score >= 60) return "score-high";
  if (score >= 40) return "score-mid";
  return "score-low";
}

export default function ScoreResult({ result, apiErrors, networkError, loading }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animateBars, setAnimateBars] = useState(false);
  const [prevResultId, setPrevResultId] = useState(null);

  // Update states during render when result changes to reset animation states
  if (result && result.request_id !== prevResultId) {
    setPrevResultId(result.request_id);
    setAnimateBars(false);
    setAnimatedScore(0);
  }

  // Trigger progress bar animation after reset
  useEffect(() => {
    if (result && !animateBars) {
      const timer = setTimeout(() => {
        setAnimateBars(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [result, animateBars]);

  // Animate score counting up
  useEffect(() => {
    if (result && result.score !== undefined) {
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

      {/* Risk Category Badge */}
      {result.risk_category && (
        <div className="risk-category-badge-container">
          <span className={`risk-category-badge ${currentScoreClass}`}>
            {result.risk_category.replace("_", " ")}
          </span>
        </div>
      )}

      {/* Explainable Factor Details (Dashboard) */}
      <div className="explanation-section-block">
        <h4 className="detail-title">Score Attribution</h4>
        <div className="contribution-dashboard">
          <div className="contribution-row">
            <div className="contribution-meta">
              <span className="factor-name">Repayment History</span>
              <span className="factor-pts">{result.contributions.repayment_history} / 35 pts</span>
            </div>
            <div className="bar-container">
              <div
                className={`bar-fill ${currentScoreClass}`}
                style={{ width: `${animateBars ? (result.contributions.repayment_history / 35) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <div className="contribution-row">
            <div className="contribution-meta">
              <span className="factor-name">Land Size</span>
              <span className="factor-pts">{result.contributions.land_area} / 25 pts</span>
            </div>
            <div className="bar-container">
              <div
                className={`bar-fill ${currentScoreClass}`}
                style={{ width: `${animateBars ? (result.contributions.land_area / 25) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <div className="contribution-row">
            <div className="contribution-meta">
              <span className="factor-name">Income Bracket</span>
              <span className="factor-pts">{result.contributions.income_band} / 25 pts</span>
            </div>
            <div className="bar-container">
              <div
                className={`bar-fill ${currentScoreClass}`}
                style={{ width: `${animateBars ? (result.contributions.income_band / 25) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
          
          <div className="contribution-row">
            <div className="contribution-meta">
              <span className="factor-name">Crop Risk Rating</span>
              <span className="factor-pts">{result.contributions.crop_risk} / 15 pts</span>
            </div>
            <div className="bar-container">
              <div
                className={`bar-fill ${currentScoreClass}`}
                style={{ width: `${animateBars ? (result.contributions.crop_risk / 15) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Risk Summary Block */}
      {result.risk_summary && (
        <div className="ai-risk-summary-block">
          <h4 className="detail-title">AI Risk Summary</h4>
          <p className="risk-summary-text">{result.risk_summary}</p>
        </div>
      )}

      {/* AI Recommendations Block */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="ai-recommendations-block">
          <h4 className="detail-title">AI Recommendations</h4>
          <ul className="recommendations-list">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="recommendation-item">
                <span className="recommendation-bullet">
                  <svg className="rec-bullet-svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </span>
                <span className="recommendation-text">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction Details */}
      <div className="audit-ledger-block">
        <h4 className="detail-title">Audit Log Trail</h4>
        <div className="meta-table">
          <div className="meta-table-row">
            <span className="meta-key">Reference ID</span>{" "}
            <span className="meta-val monospace">{result.request_id}</span>
          </div>
          <div className="meta-table-row">
            <span className="meta-key">Logged At</span>{" "}
            <span className="meta-val">{new Date(result.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="meta-table-row">
            <span className="meta-key">SQLite Write</span>{" "}
            <span className="meta-val text-green">Success</span>
          </div>
        </div>
      </div>
    </div>
  );
}
