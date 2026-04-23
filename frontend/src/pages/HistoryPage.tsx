import "./HistoryPage.css";
import { useState, useEffect, useCallback, Fragment } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { MatchHistoryEntry } from "../types";

const PAGE_SIZE = 20;

const CATEGORIES = [
  "all",
  "math",
  "strings",
  "logic",
  "arrays",
  "sorting",
  "searching",
  "stacks",
];

const MODES = ["all", "ranked", "ffa"] as const;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDifficultyClass(difficulty: string): string {
  switch (difficulty) {
    case "EASY":
      return "history__badge--easy";
    case "MEDIUM":
      return "history__badge--medium";
    case "HARD":
      return "history__badge--hard";
    default:
      return "";
  }
}

function getResult(
  entry: MatchHistoryEntry,
  userId: string
): { label: string; className: string } {
  const other = entry.match.participants.find((p) => p.userId !== userId);
  if (!other) return { label: "N/A", className: "" };

  // We need the other participant's passedCount — it's on the MatchHistoryEntry level
  // but the API only gives us our own passedCount directly. We compare via match participants.
  // Since we only have our passedCount from the entry, we need to find opponent's from the match data.
  // The match.participants array doesn't carry passedCount, so we compare our passedCount
  // with the opponent's by looking at relative ELO change.
  const eloDelta = (entry.endElo ?? entry.startElo) - entry.startElo;

  if (eloDelta > 0) return { label: "Win", className: "history__result--win" };
  if (eloDelta < 0) return { label: "Loss", className: "history__result--loss" };
  return { label: "Draw", className: "history__result--draw" };
}

interface SolutionData {
  python: string;
  cpp: string;
  java: string;
}

const SOLUTION_LANGS = [
  { key: "python", label: "Python" },
  { key: "cpp", label: "C++" },
  { key: "java", label: "Java" },
] as const;

export function HistoryPage() {
  const { user, token } = useAuth();
  const [entries, setEntries] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState("all");
  const [mode, setMode] = useState("all");

  // Solution viewer state
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [solutionData, setSolutionData] = useState<SolutionData | null>(null);
  const [solutionLang, setSolutionLang] = useState<string>("python");
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  const handleViewSolution = async (matchId: string) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      setSolutionData(null);
      setSolutionError(null);
      return;
    }
    setExpandedMatchId(matchId);
    setSolutionData(null);
    setSolutionError(null);
    setSolutionLang("python");
    setSolutionLoading(true);
    try {
      const data = await api<{ solution: SolutionData }>(
        "GET",
        `/api/matches/${matchId}/solution`,
        { token: token! }
      );
      setSolutionData(data.solution);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load solution";
      setSolutionError(message);
    } finally {
      setSolutionLoading(false);
    }
  };

  const fetchHistory = useCallback(
    async (offset: number, append: boolean) => {
      if (!token) return;
      try {
        const query: Record<string, string | number | undefined> = {
          limit: PAGE_SIZE,
          offset,
        };
        if (category !== "all") query.category = category;
        if (mode !== "all") query.mode = mode;

        const data = await api<MatchHistoryEntry[]>(
          "GET",
          "/api/matches/history",
          { token, query }
        );

        if (append) {
          setEntries((prev) => [...prev, ...data]);
        } else {
          setEntries(data);
        }
        setHasMore(data.length === PAGE_SIZE);
        setError(null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load match history";
        setError(message);
      }
    },
    [token, category, mode]
  );

  // Reset and fetch when filters change
  useEffect(() => {
    setLoading(true);
    setEntries([]);
    fetchHistory(0, false).finally(() => setLoading(false));
  }, [fetchHistory]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchHistory(entries.length, true);
    setLoadingMore(false);
  };

  if (!user) {
    return (
      <div className="history-page">
        <p>Please login to view match history.</p>
      </div>
    );
  }

  return (
    <div className="history-page">
      <h1 className="history__title">Match History</h1>

      <div className="history__filters">
        <select
          className="history__filter-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select
          className="history__filter-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          {MODES.map((m) => (
            <option key={m} value={m}>
              {m === "all" ? "All Modes" : m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="history__container">
        {loading && <div className="history__loading">Loading matches...</div>}

        {error && <div className="history__error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="history__empty">No matches found</div>
        )}

        {!loading && entries.length > 0 && (
          <>
            <table className="history__table">
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>ELO</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const opponent = entry.match.participants.find(
                    (p) => p.userId !== user.id
                  );
                  const result = getResult(entry, user.id);
                  const eloDelta =
                    (entry.endElo ?? entry.startElo) - entry.startElo;
                  const eloSign = eloDelta > 0 ? "+" : "";
                  const eloClass =
                    eloDelta > 0
                      ? "history__elo-change--positive"
                      : eloDelta < 0
                        ? "history__elo-change--negative"
                        : "history__elo-change--neutral";

                  const isExpanded = expandedMatchId === entry.match.id;

                  return (
                    <Fragment key={entry.match.id}>
                      <tr>
                        <td>
                          <div>
                            {entry.match.problem?.title ?? "Unknown"}
                            {entry.match.problem && (
                              <span
                                className={`history__badge ${getDifficultyClass(entry.match.problem.difficulty)}`}
                                style={{ marginLeft: "8px" }}
                              >
                                {entry.match.problem.difficulty}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{opponent?.user.username ?? "N/A"}</td>
                        <td>
                          <span className={`history__result ${result.className}`}>
                            {result.label}
                          </span>
                        </td>
                        <td>
                          <span className="history__score">
                            {entry.passedCount}
                          </span>
                        </td>
                        <td>
                          <span className={`history__elo-change ${eloClass}`}>
                            {eloSign}
                            {eloDelta}
                          </span>
                        </td>
                        <td>
                          <span className="history__date">
                            {formatDate(entry.match.createdAt)}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`history__view-solution ${isExpanded ? "history__view-solution--active" : ""}`}
                            onClick={() => handleViewSolution(entry.match.id)}
                          >
                            {isExpanded ? "Hide" : "View Solution"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="history__solution-row">
                          <td colSpan={7}>
                            <div className="history__solution-panel">
                              {solutionLoading && (
                                <div className="history__solution-loading">Loading solution...</div>
                              )}
                              {solutionError && (
                                <div className="history__solution-error">{solutionError}</div>
                              )}
                              {solutionData && (
                                <>
                                  <div className="history__solution-tabs">
                                    {SOLUTION_LANGS.map((lang) => (
                                      <button
                                        key={lang.key}
                                        className={`history__solution-tab ${solutionLang === lang.key ? "history__solution-tab--active" : ""}`}
                                        onClick={() => setSolutionLang(lang.key)}
                                      >
                                        {lang.label}
                                      </button>
                                    ))}
                                    <button
                                      className="history__solution-close"
                                      onClick={() => { setExpandedMatchId(null); setSolutionData(null); }}
                                    >
                                      Close
                                    </button>
                                  </div>
                                  <pre className="history__solution-code">
                                    <code>{solutionData[solutionLang as keyof SolutionData]}</code>
                                  </pre>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {hasMore && (
              <button
                className="history__load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
