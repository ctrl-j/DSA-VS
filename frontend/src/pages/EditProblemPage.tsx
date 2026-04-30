import "./EditProblemPage.css";
import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

interface ProblemEditData {
  id: string;
  title: string;
  statement: string;
  difficulty: string;
  category: string;
  approvalStatus: string;
}

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export function EditProblemPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [problem, setProblem] = useState<ProblemEditData | null>(null);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [difficulty, setDifficulty] = useState("EASY");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isApproved = problem?.approvalStatus === "APPROVED";

  useEffect(() => {
    if (!token || !id) return;
    let cancelled = false;

    async function fetchProblem() {
      try {
        const data = await api<ProblemEditData>(
          "GET",
          `/api/problems/${id}/edit`,
          { token: token! }
        );
        if (!cancelled) {
          setProblem(data);
          setTitle(data.title);
          setStatement(data.statement);
          setDifficulty(data.difficulty);
          setCategory(data.category);
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Failed to load problem";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProblem();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !id || isApproved) return;
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      await api("PATCH", `/api/problems/${id}`, {
        token,
        body: { title, statement, difficulty, category },
      });
      setMessage("Updated!");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Failed to update problem";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-problem-page">
        <div className="edit-problem__loading">Loading problem...</div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="edit-problem-page">
        <div className="edit-problem__error">{error}</div>
        <Link to="/problems/mine" className="edit-problem__back">
          Back to My Submissions
        </Link>
      </div>
    );
  }

  return (
    <div className="edit-problem-page">
      <h1 className="edit-problem__title">Edit Problem</h1>

      {isApproved && (
        <div className="edit-problem__approved-notice">
          This problem has been approved and cannot be edited.
        </div>
      )}

      <form className="edit-problem__form" onSubmit={onSubmit}>
        <div className="edit-problem__field">
          <label className="edit-problem__label" htmlFor="ep-title">
            Title
          </label>
          <input
            id="ep-title"
            className="edit-problem__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isApproved}
            placeholder="Problem title"
          />
        </div>

        <div className="edit-problem__field">
          <label className="edit-problem__label" htmlFor="ep-statement">
            Statement
          </label>
          <textarea
            id="ep-statement"
            className="edit-problem__textarea"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            disabled={isApproved}
            placeholder="Problem description (Markdown supported)"
          />
        </div>

        <div className="edit-problem__row">
          <div className="edit-problem__field">
            <label className="edit-problem__label" htmlFor="ep-difficulty">
              Difficulty
            </label>
            <select
              id="ep-difficulty"
              className="edit-problem__select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              disabled={isApproved}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="edit-problem__field">
            <label className="edit-problem__label" htmlFor="ep-category">
              Category
            </label>
            <input
              id="ep-category"
              className="edit-problem__input"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isApproved}
              placeholder="e.g. arrays, strings"
            />
          </div>
        </div>

        {!isApproved && (
          <button
            type="submit"
            className="edit-problem__submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </form>

      {message && <p className="edit-problem__message">{message}</p>}
      {error && problem && (
        <p className="edit-problem__error-msg">{error}</p>
      )}

      <Link to="/problems/mine" className="edit-problem__back">
        Back to My Submissions
      </Link>
    </div>
  );
}
