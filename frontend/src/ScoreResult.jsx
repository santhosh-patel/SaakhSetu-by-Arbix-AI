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

export default function ScoreResult({ result, apiErrors, networkError }) {
  if (networkError) {
    return (
      <div className="result error">
        <h3>Error</h3>
        <p>{networkError}</p>
      </div>
    );
  }

  if (apiErrors && apiErrors.length > 0) {
    return (
      <div className="result error">
        <h3>Validation Errors</h3>
        <ul className="error-list">
          {apiErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="result success">
      <h3>Score Result</h3>
      <p className={`score-value ${scoreClass(result.score)}`}>{result.score}</p>
      <div className="reason-codes">
        <h4>Reason Codes</h4>
        <ul>
          {result.reason_codes.map((code) => (
            <li key={code} className="reason-chip">
              {code}
            </li>
          ))}
        </ul>
      </div>
      <dl className="meta">
        <dt>Request ID</dt>
        <dd>{result.request_id}</dd>
        <dt>Timestamp</dt>
        <dd>{result.timestamp}</dd>
      </dl>
    </div>
  );
}
