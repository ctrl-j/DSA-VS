import "./LeaderboardPage.css";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

interface LeaderboardEntry {
  id: string;
  username: string;
  elo: number;
  winRate: number;
  rank: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  myPosition?: { rank: number; elo: number; winRate: number };
}

export function LeaderboardPage() {
  const { user, token } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myPosition, setMyPosition] = useState<LeaderboardResponse["myPosition"]>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    async function fetchLeaderboard() {
      try {
        const data = await api<LeaderboardResponse>("GET", "/api/leaderboard", {
          token: token!,
          query: { userId: user!.id },
        });
        if (!cancelled) {
          setEntries(data.leaderboard);
          setMyPosition(data.myPosition);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load leaderboard";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [token, user]);

  if (!user) {
    return (
      <div className="lb-page">
        <p className="lb__empty">Please login to view the leaderboard.</p>
      </div>
    );
  }

  const userInTop100 = entries.some((e) => e.id === user.id);

  return (
    <div className="lb-page">
      <h1 className="lb__title">Leaderboard</h1>

      <div className="lb__container">
        {loading && <div className="lb__loading">Loading leaderboard...</div>}

        {error && <div className="lb__error">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="lb__empty">No players ranked yet.</div>
        )}

        {!loading && entries.length > 0 && (
          <table className="lb__table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>Elo</th>
                <th>Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isCurrentUser = entry.id === user.id;
                return (
                  <tr
                    key={entry.id}
                    className={isCurrentUser ? "lb__row--current" : ""}
                  >
                    <td>
                      <span className="lb__rank">{entry.rank}</span>
                    </td>
                    <td>
                      <span className={isCurrentUser ? "lb__username--current" : ""}>
                        {entry.username}
                      </span>
                    </td>
                    <td>
                      <span className="lb__elo">{entry.elo}</span>
                    </td>
                    <td>
                      <span className="lb__winrate">
                        {(entry.winRate * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {!loading && !error && !userInTop100 && myPosition && (
          <div className="lb__my-position">
            <h2 className="lb__my-position-title">Your Position</h2>
            <div className="lb__my-position-stats">
              <div className="lb__my-position-stat">
                <span className="lb__my-position-label">Rank</span>
                <span className="lb__my-position-value">{myPosition.rank}</span>
              </div>
              <div className="lb__my-position-stat">
                <span className="lb__my-position-label">Elo</span>
                <span className="lb__my-position-value">{myPosition.elo}</span>
              </div>
              <div className="lb__my-position-stat">
                <span className="lb__my-position-label">Win Rate</span>
                <span className="lb__my-position-value">
                  {(myPosition.winRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
