import { useState } from "react";
import { submitScore, getScores, getAuditLogs } from "./api";
import CreditAdvisorChat from "./CreditAdvisorChat";
import ScoreForm from "./ScoreForm";
import ScoreResult from "./ScoreResult";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("calculator");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiErrors, setApiErrors] = useState([]);
  const [networkError, setNetworkError] = useState(null);

  // Score History States
  const [scoresHistory, setScoresHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // Audit Log States
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatRequestId, setChatRequestId] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setResult(null);
    setApiErrors([]);
    setNetworkError(null);

    try {
      const data = await submitScore(formData);
      setResult(data);
      // Link this score's request ID to the advisor chatbot context
      setChatRequestId(data.request_id);
    } catch (err) {
      if (err.status === 422 && err.detail) {
        setApiErrors(err.detail);
      } else if (err.message) {
        setNetworkError(err.message);
      } else {
        setNetworkError("Unable to reach the scoring service. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getScores();
      // Sort newest first
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setScoresHistory(data);
    } catch (err) {
      setHistoryError(err.message || "Failed to load score history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLogsData = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await getAuditLogs();
      // Sort newest first
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAuditLogs(data);
    } catch (err) {
      setLogsError(err.message || "Failed to load audit logs.");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleInspectScore = async (reqId) => {
    setLoading(true);
    setActiveTab("calculator");
    try {
      const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/scores/${reqId}`);
      if (!response.ok) {
        throw new Error("Failed to load details");
      }
      const detailedRecord = await response.json();
      setResult(detailedRecord);
      setChatRequestId(reqId);
      setChatOpen(true);
    } catch (err) {
      alert("Failed to load details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskCategoryLabel = (cat) => {
    if (!cat) return "";
    return cat.replace("_", " ");
  };

  const getScoreColorClass = (score) => {
    if (score >= 60) return "score-high";
    if (score >= 40) return "score-mid";
    return "score-low";
  };

  return (
    <div className="app-container">
      {/* Background soft mesh gradients */}
      <div className="bg-mesh bg-mesh-1"></div>
      <div className="bg-mesh bg-mesh-2"></div>

      {/* Navigation Header */}
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

      {/* Interactive Tabbed Interface */}
      <main className="main-content">
        <div className="glass-card">
          <div className="card-tabs-nav">
            <button
              className={`tab-btn ${activeTab === "calculator" ? "active" : ""}`}
              onClick={() => setActiveTab("calculator")}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              <span>Score Calculator</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("history");
                fetchHistoryData();
              }}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
                <path d="M3.3 7a10 9 0 1 1-1.3 5"></path>
              </svg>
              <span>Score History</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("logs");
                fetchLogsData();
              }}
            >
              <svg className="tab-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Audit Logs</span>
            </button>
          </div>

          <div className="tab-content-panel">
            {/* Calculator Tab */}
            {activeTab === "calculator" && (
              <div className="calculator-grid">
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
            )}

            {/* Score History Tab */}
            {activeTab === "history" && (
              <div className="history-tab-panel">
                <div className="section-header-row">
                  <h2>Calculation History</h2>
                  <button className="refresh-btn" onClick={fetchHistoryData}>
                    <svg className="action-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>

                {historyLoading ? (
                  <div className="tab-state-loading">
                    <span className="loading-spinner"></span>
                    Loading history...
                  </div>
                ) : historyError ? (
                  <div className="tab-state-error">
                    <svg className="error-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>{historyError}</span>
                  </div>
                ) : scoresHistory.length === 0 ? (
                  <div className="tab-state-empty">
                    <svg className="empty-icon-svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>No previous score calculations found. Run a calculation first!</span>
                  </div>
                ) : (
                  <div className="scores-history-list">
                    {scoresHistory.map((item) => (
                      <div key={item.request_id} className="history-item-row">
                        <div className="history-meta-left">
                          <span className="history-ref">ID: {item.request_id.substring(0, 8)}...</span>
                          <span className="history-date">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="history-meta-right">
                          <span className={`history-score-badge ${getScoreColorClass(item.score)}`}>
                            {item.score} Score
                          </span>
                          <button
                            className="inspect-btn"
                            onClick={() => handleInspectScore(item.request_id)}
                          >
                            Inspect Detail ➜
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === "logs" && (
              <div className="logs-tab-panel">
                <div className="section-header-row">
                  <h2>System Audit Trails</h2>
                  <button className="refresh-btn" onClick={fetchLogsData}>
                    <svg className="action-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    <span>Refresh</span>
                  </button>
                </div>

                {logsLoading ? (
                  <div className="tab-state-loading">
                    <span className="loading-spinner"></span>
                    Loading audit trails...
                  </div>
                ) : logsError ? (
                  <div className="tab-state-error">
                    <svg className="error-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>{logsError}</span>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="tab-state-empty">
                    <svg className="empty-icon-svg" viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>No system logs found.</span>
                  </div>
                ) : (
                  <div className="audit-table-wrapper">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Reference ID</th>
                          <th>Logged At</th>
                          <th>Score</th>
                          <th>Risk Category</th>
                          <th>Reason Codes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log) => (
                          <tr key={log.request_id} className="audit-row-item">
                            <td className="monospace-cell" title={log.request_id}>
                              {log.request_id.substring(0, 8)}...
                            </td>
                            <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td>
                              <span className={`table-score-tag ${getScoreColorClass(log.score)}`}>
                                {log.score}
                              </span>
                            </td>
                            <td>
                              <span className={`risk-tag-cell ${getScoreColorClass(log.score)}`}>
                                {getRiskCategoryLabel(log.risk_category)}
                              </span>
                            </td>
                            <td>
                              <div className="table-reason-pills">
                                {log.reason_codes.map((code) => (
                                  <span key={code} className="reason-pill">
                                    {code}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
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

      <CreditAdvisorChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        profileRequestId={chatRequestId}
        onClearProfile={() => setChatRequestId(null)}
        fallbackRequestId={result?.request_id}
      />

      {/* Footer */}
      <footer className="footer">
        <p>© 2026 SaakhSetu. Transparent & explainable credit decisions.</p>
      </footer>
    </div>
  );
}
