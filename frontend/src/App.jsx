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
    <div className="app">
      <header>
        <h1>SaakhSetu</h1>
        <p className="subtitle">Agricultural Credit Scoring</p>
      </header>

      <main className="card">
        <ScoreForm onSubmit={handleSubmit} loading={loading} />
        <ScoreResult
          result={result}
          apiErrors={apiErrors}
          networkError={networkError}
        />
      </main>
    </div>
  );
}
