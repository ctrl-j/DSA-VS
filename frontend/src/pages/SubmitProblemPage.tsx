import "./SubmitProblemPage.css";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export function SubmitProblemPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [difficulty, setDifficulty] = useState<string>("EASY");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (!title.trim() || !statement.trim() || !difficulty || !category.trim()) {
      return setError("All fields are required.");
    }

    setLoading(true);
    try {
      await api("POST", "/api/problems/submit", {
        token,
        body: {
          title: title.trim(),
          statement: statement.trim(),
          difficulty,
          category: category.trim(),
        },
      });
      setMessage("Problem submitted successfully! Redirecting...");
      setTimeout(() => navigate("/problems/mine"), 2000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to submit problem.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-problem-page">
      <h1 className="submit-problem__title">Submit a Problem</h1>

      <form className="submit-problem__form" onSubmit={onSubmit}>
        <div className="submit-problem__field">
          <label className="submit-problem__label">Title</label>
          <input
            className="submit-problem__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Two Sum"
          />
        </div>

        <div className="submit-problem__field">
          <label className="submit-problem__label">Statement</label>
          <textarea
            className="submit-problem__textarea"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Describe the problem in detail..."
          />
        </div>

        <div className="submit-problem__field">
          <label className="submit-problem__label">Difficulty</label>
          <select
            className="submit-problem__select"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="submit-problem__field">
          <label className="submit-problem__label">Category</label>
          <input
            className="submit-problem__input"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. arrays, strings, math"
          />
        </div>

        <button
          type="submit"
          className="submit-problem__submit"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Problem"}
        </button>
      </form>

      {message && <p className="submit-problem__message">{message}</p>}
      {error && <p className="submit-problem__error" role="alert">{error}</p>}
    </div>
  );
}
