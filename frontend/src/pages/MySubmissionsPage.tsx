import "./MySubmissionsPage.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

interface MyProblem {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  approvalStatus: string;
  _count: { testCases: number };
}

function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case "EASY":
      return "my-subs__badge--easy";
    case "MEDIUM":
      return "my-subs__badge--medium";
    case "HARD":
      return "my-subs__badge--hard";
    default:
      return "";
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "my-subs__status--pending";
    case "APPROVED":
      return "my-subs__status--approved";
    case "REJECTED":
      return "my-subs__status--rejected";
    default:
      return "";
  }
}

export function MySubmissionsPage() {
  const { token } = useAuth();
  const [problems, setProblems] = useState<MyProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchProblems() {
      try {
        const data = await api<MyProblem[]>("GET", "/api/problems/mine", {
          token: token!,
        });
        if (!cancelled) setProblems(data);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Failed to load submissions";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProblems();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="my-subs-page">
      <h1 className="my-subs__title">My Submissions</h1>

      <Link to="/problems/submit" className="my-subs__submit-btn">
        Submit New Problem
      </Link>

      <div className="my-subs__container">
        {loading && (
          <div className="my-subs__loading">Loading submissions...</div>
        )}

        {error && <div className="my-subs__error">{error}</div>}

        {!loading && !error && problems.length === 0 && (
          <div className="my-subs__empty">
            You haven't submitted any problems yet.
          </div>
        )}

        {!loading && problems.length > 0 && (
          <table className="my-subs__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Category</th>
                <th>Test Cases</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem) => {
                const isApproved = problem.approvalStatus === "APPROVED";
                return (
                  <tr key={problem.id}>
                    <td className="my-subs__cell-title">{problem.title}</td>
                    <td>
                      <span
                        className={`my-subs__badge ${getDifficultyClass(problem.difficulty)}`}
                      >
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="my-subs__cell-category">
                      {problem.category}
                    </td>
                    <td className="my-subs__cell-count">
                      {problem._count.testCases}
                    </td>
                    <td>
                      <span
                        className={`my-subs__status ${getStatusClass(problem.approvalStatus)}`}
                      >
                        {problem.approvalStatus}
                      </span>
                    </td>
                    <td className="my-subs__actions">
                      <span
                        className={`my-subs__action-wrapper ${isApproved ? "my-subs__action-wrapper--disabled" : ""}`}
                        title={
                          isApproved
                            ? "Approved problems cannot be edited"
                            : undefined
                        }
                      >
                        {isApproved ? (
                          <span className="my-subs__action-link my-subs__action-link--disabled">
                            Edit
                          </span>
                        ) : (
                          <Link
                            to={`/problems/${problem.id}/edit`}
                            className="my-subs__action-link"
                          >
                            Edit
                          </Link>
                        )}
                      </span>
                      <Link
                        to={`/problems/${problem.id}/test-cases`}
                        className="my-subs__action-link"
                      >
                        Add Tests
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
