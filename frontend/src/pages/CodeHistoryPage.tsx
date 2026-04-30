import "./CodeHistoryPage.css";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { Difficulty } from "../types";

interface CodeHistoryProblem {
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
}

interface CodeHistoryMatch {
  id: string;
  mode: string;
  startedAt: string | null;
  endedAt: string | null;
  problem: CodeHistoryProblem;
}

interface CodeHistorySubmission {
  id: string;
  language: string;
  code: string;
  passedCount: number;
  status: string;
  createdAt: string;
  match: CodeHistoryMatch;
}

interface PerformanceScoreResponse {
  username: string;
  performanceScore: number | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLanguage(lang: string): string {
  const map: Record<string, string> = {
    python: "Python",
    cpp: "C++",
    java: "Java",
  };
  return map[lang.toLowerCase()] ?? lang;
}

function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case "EASY":
      return "codehist__badge--easy";
    case "MEDIUM":
      return "codehist__badge--medium";
    case "HARD":
      return "codehist__badge--hard";
    default:
      return "";
  }
}

export function CodeHistoryPage() {
  const { user, token } = useAuth();
  const [submissions, setSubmissions] = useState<CodeHistorySubmission[]>([]);
  const [performanceScore, setPerformanceScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [subs, perf] = await Promise.all([
          api<CodeHistorySubmission[]>(
            "GET",
            `/api/users/${user!.username}/code-history`,
            { token: token!, query: { limit: 20 } }
          ),
          api<PerformanceScoreResponse>(
            "GET",
            `/api/users/${user!.username}/performance-score`,
            { token: token! }
          ),
        ]);
        if (!cancelled) {
          setSubmissions(subs);
          setPerformanceScore(perf.performanceScore);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const message =
            e instanceof Error ? e.message : "Failed to load code history";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  if (!token || !user) {
    return (
      <div className="codehist-page">
        <p>Please login to view code history.</p>
      </div>
    );
  }

  return (
    <div className="codehist-page">
      <h1 className="codehist__title">Code History</h1>

      {performanceScore !== null && (
        <div className="codehist__performance">
          <span className="codehist__performance-label">
            Performance Score
          </span>
          <span className="codehist__performance-value">
            {performanceScore}
          </span>
        </div>
      )}

      <div className="codehist__container">
        {loading && (
          <div className="codehist__loading">Loading code history...</div>
        )}

        {error && <div className="codehist__error">{error}</div>}

        {!loading && !error && submissions.length === 0 && (
          <div className="codehist__empty">No code history yet</div>
        )}

        {!loading && !error && submissions.length > 0 && (
          <div className="codehist__list">
            {submissions.map((sub) => (
              <div key={sub.id} className="codehist__card">
                <button
                  className="codehist__card-header"
                  onClick={() => toggleExpand(sub.id)}
                  type="button"
                >
                  <div className="codehist__card-left">
                    <span className="codehist__problem-title">
                      {sub.match.problem.title}
                    </span>
                    <div className="codehist__badges">
                      <span
                        className={`codehist__badge ${getDifficultyClass(sub.match.problem.difficulty)}`}
                      >
                        {sub.match.problem.difficulty}
                      </span>
                      <span className="codehist__badge codehist__badge--lang">
                        {formatLanguage(sub.language)}
                      </span>
                      <span className="codehist__badge codehist__badge--mode">
                        {sub.match.mode}
                      </span>
                    </div>
                  </div>
                  <div className="codehist__card-right">
                    <span className="codehist__passed">
                      {sub.passedCount} passed
                    </span>
                    <span className="codehist__date">
                      {formatDate(sub.createdAt)}
                    </span>
                    <span
                      className={`codehist__expand-icon ${expandedId === sub.id ? "codehist__expand-icon--open" : ""}`}
                    >
                      &#9662;
                    </span>
                  </div>
                </button>

                {expandedId === sub.id && (
                  <div className="codehist__code-panel">
                    <pre className="codehist__code-block">
                      <code>{sub.code}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
