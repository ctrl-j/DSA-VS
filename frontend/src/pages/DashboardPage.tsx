import "./DashboardPage.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWs } from "../providers/WebSocketProvider";
import { api } from "../services/api";
import type { MatchHistoryEntry } from "../types";

function getRankLabel(elo: number): string {
  if (elo >= 2000) return "GRANDMASTER";
  if (elo >= 1700) return "MASTER";
  if (elo >= 1400) return "DIAMOND";
  if (elo >= 1100) return "GOLD";
  if (elo >= 800) return "SILVER";
  return "BRONZE";
}

export function DashboardPage() {
  const { user, token, bannedMessage, refreshMe } = useAuth();
  const { connected } = useWs();
  const [activeMatch, setActiveMatch] = useState<{ id: string; opponentName: string } | null>(null);

  // Refresh user data on mount to get updated ELO after matches
  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  // Check for active matches on mount
  useEffect(() => {
    if (!token || !user) return;

    let cancelled = false;

    async function checkActiveMatch() {
      try {
        const history = await api<MatchHistoryEntry[]>("GET", "/api/matches/history", {
          token: token!,
          query: { limit: 5 },
        });
        if (cancelled) return;

        const active = history.find((entry) => entry.match.status === "ACTIVE");
        if (active) {
          const opponent = active.match.participants.find(
            (p) => p.userId !== user!.id
          );
          setActiveMatch({
            id: active.match.id,
            opponentName: opponent?.user.username ?? "Opponent",
          });
        }
      } catch {
        // Ignore errors fetching history
      }
    }

    checkActiveMatch();
    return () => { cancelled = true; };
  }, [token, user]);

  if (bannedMessage) {
    return (
      <div className="dashboard-page">
        <p role="alert" style={{ color: "var(--error)" }}>
          {bannedMessage}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="dashboard-page">
        <p>Please login or register.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <span className="dashboard__welcome">Welcome back</span>
      <h1 className="dashboard__username">{user.username}</h1>

      <div className="dashboard__elo-block">
        <span className="dashboard__elo-label">Rating</span>
        <span className="dashboard__elo-value">{user.elo}</span>
        <span className="dashboard__elo-badge">{getRankLabel(user.elo)}</span>
      </div>

      {activeMatch && (
        <Link to={`/match/${activeMatch.id}`} className="dashboard__active-match">
          <span className="dashboard__active-match-pulse" />
          <div className="dashboard__active-match-content">
            <span className="dashboard__active-match-label">MATCH IN PROGRESS</span>
            <span className="dashboard__active-match-detail">
              vs {activeMatch.opponentName}
            </span>
          </div>
          <span className="dashboard__active-match-action">CONTINUE MATCH</span>
        </Link>
      )}

      <div className="dashboard__actions">
        <Link to="/queue" className="dashboard__action-card dashboard__action-card--play">
          <span className="dashboard__action-label">Play</span>
          <span className="dashboard__action-sub">Find a match</span>
        </Link>
        <Link to="/private-match" className="dashboard__action-card">
          <span className="dashboard__action-label">Private</span>
          <span className="dashboard__action-sub">Create or join</span>
        </Link>
        <Link to="/leaderboard" className="dashboard__action-card">
          <span className="dashboard__action-label">Leaderboard</span>
          <span className="dashboard__action-sub">Rankings</span>
        </Link>
        <Link to="/history" className="dashboard__action-card">
          <span className="dashboard__action-label">History</span>
          <span className="dashboard__action-sub">Match history</span>
        </Link>
        <Link to="/stats" className="dashboard__action-card">
          <span className="dashboard__action-label">Stats</span>
          <span className="dashboard__action-sub">Charts &amp; analytics</span>
        </Link>
        <Link to="/global-stats" className="dashboard__action-card">
          <span className="dashboard__action-label">Global</span>
          <span className="dashboard__action-sub">Community stats</span>
        </Link>
        <Link to="/problems/submit" className="dashboard__action-card">
          <span className="dashboard__action-label">Submit</span>
          <span className="dashboard__action-sub">Add a problem</span>
        </Link>
        <Link to="/focus" className="dashboard__action-card">
          <span className="dashboard__action-label">Focus</span>
          <span className="dashboard__action-sub">Practice patterns</span>
        </Link>
        <Link to="/language-stats" className="dashboard__action-card">
          <span className="dashboard__action-label">Languages</span>
          <span className="dashboard__action-sub">Language stats</span>
        </Link>
      </div>

      {user.isAdmin && (
        <div className="dashboard__admin-section">
          <span className="dashboard__admin-heading">Admin</span>
          <div className="dashboard__actions">
            <Link to="/admin/problems" className="dashboard__action-card dashboard__action-card--admin">
              <span className="dashboard__action-label">Review</span>
              <span className="dashboard__action-sub">Pending submissions</span>
            </Link>
            <Link to="/admin/reports/users" className="dashboard__action-card dashboard__action-card--admin">
              <span className="dashboard__action-label">Reports</span>
              <span className="dashboard__action-sub">User reports</span>
            </Link>
            <Link to="/admin/bug-reports" className="dashboard__action-card dashboard__action-card--admin">
              <span className="dashboard__action-label">Bugs</span>
              <span className="dashboard__action-sub">Bug reports</span>
            </Link>
            <Link to="/admin/chats" className="dashboard__action-card dashboard__action-card--admin">
              <span className="dashboard__action-label">Chats</span>
              <span className="dashboard__action-sub">View user chats</span>
            </Link>
          </div>
        </div>
      )}

      <div className="dashboard__stats">
        <div className="dashboard__stat">
          <span className="dashboard__stat-value">{user.elo}</span>
          <span className="dashboard__stat-label">ELO</span>
        </div>
        <div className="dashboard__stat">
          <span className="dashboard__stat-value">--</span>
          <span className="dashboard__stat-label">Matches</span>
        </div>
      </div>

      <div className="dashboard__ws-indicator">
        <span
          className={`dashboard__ws-dot ${connected ? "dashboard__ws-dot--connected" : ""}`}
        />
        {connected ? "Connected" : "Disconnected"}
      </div>
    </div>
  );
}
