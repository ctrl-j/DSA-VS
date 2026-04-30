import "./AdminReviewPage.css";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

interface PendingProblem {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  submittedBy: { username: string };
  _count: { testCases: number };
}

function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case "EASY":
      return "review__badge--easy";
    case "MEDIUM":
      return "review__badge--medium";
    case "HARD":
      return "review__badge--hard";
    default:
      return "";
  }
}

export function AdminReviewPage() {
  const { user, token } = useAuth();
  const [problems, setProblems] = useState<PendingProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = user?.isAdmin === true;

  useEffect(() => {
    if (!token || !isAdmin) return;
    let cancelled = false;

    async function fetchPending() {
      try {
        const data = await api<PendingProblem[]>(
          "GET",
          "/api/admin/problems/pending",
          { token: token! }
        );
        if (!cancelled) setProblems(data);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Failed to load pending problems";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPending();
    return () => {
      cancelled = true;
    };
  }, [token, isAdmin]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (problemId: string) => {
    if (!token) return;
    setActionLoading(problemId);
    try {
      await api("POST", `/api/admin/problems/${problemId}/approve`, { token });
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
      showToast("Problem approved successfully.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Approve failed";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (problemId: string) => {
    if (!token || !feedback.trim()) return;
    setActionLoading(problemId);
    try {
      await api("POST", `/api/admin/problems/${problemId}/reject`, {
        token,
        body: { feedback: feedback.trim() },
      });
      setProblems((prev) => prev.filter((p) => p.id !== problemId));
      setRejectingId(null);
      setFeedback("");
      showToast("Problem rejected.");
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Reject failed";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="review-page">
        <div className="review__denied">Admin access required</div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <h1 className="review__title">Review Submissions</h1>

      {toast && <div className="review__toast">{toast}</div>}

      <div className="review__container">
        {loading && (
          <div className="review__loading">Loading pending problems...</div>
        )}

        {error && <div className="review__error">{error}</div>}

        {!loading && !error && problems.length === 0 && (
          <div className="review__empty">No pending submissions to review.</div>
        )}

        {!loading && problems.length > 0 && (
          <table className="review__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Category</th>
                <th>Submitted By</th>
                <th>Test Cases</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => (
                <tr key={problem.id}>
                  <td className="review__cell-title">{problem.title}</td>
                  <td>
                    <span
                      className={`review__badge ${getDifficultyClass(problem.difficulty)}`}
                    >
                      {problem.difficulty}
                    </span>
                  </td>
                  <td className="review__cell-category">{problem.category}</td>
                  <td className="review__cell-author">
                    {problem.submittedBy.username}
                  </td>
                  <td className="review__cell-count">
                    {problem._count.testCases}
                  </td>
                  <td>
                    {rejectingId === problem.id ? (
                      <div className="review__reject-form">
                        <textarea
                          className="review__reject-input"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Rejection feedback (required)"
                          rows={2}
                        />
                        <div className="review__reject-actions">
                          <button
                            className="review__btn review__btn--reject-confirm"
                            onClick={() => handleRejectConfirm(problem.id)}
                            disabled={
                              !feedback.trim() ||
                              actionLoading === problem.id
                            }
                          >
                            {actionLoading === problem.id
                              ? "..."
                              : "Confirm Reject"}
                          </button>
                          <button
                            className="review__btn review__btn--cancel"
                            onClick={() => {
                              setRejectingId(null);
                              setFeedback("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="review__action-buttons">
                        <button
                          className="review__btn review__btn--approve"
                          onClick={() => handleApprove(problem.id)}
                          disabled={actionLoading === problem.id}
                        >
                          {actionLoading === problem.id
                            ? "..."
                            : "Approve"}
                        </button>
                        <button
                          className="review__btn review__btn--reject"
                          onClick={() => {
                            setRejectingId(problem.id);
                            setFeedback("");
                          }}
                          disabled={actionLoading === problem.id}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
