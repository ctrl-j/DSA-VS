import "./ProfilePage.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { Achievement, User } from "../types";

interface LangWinLossEntry {
  language: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

interface LanguageStatsResponse {
  winLoss: LangWinLossEntry[];
  testCases: { language: string; totalPassed: number }[];
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  cpp: "C++",
  java: "Java",
};

// "Most prominent" = highest win rate among languages with at least 3 matches.
// Fall back to the most-played language if none meet the threshold.
function pickTopLanguage(entries: LangWinLossEntry[]): LangWinLossEntry | null {
  if (entries.length === 0) return null;
  const qualified = entries.filter((e) => e.total >= 3);
  if (qualified.length === 0) {
    return [...entries].sort((a, b) => b.total - a.total)[0];
  }
  return [...qualified].sort(
    (a, b) => b.winRate - a.winRate || b.total - a.total
  )[0];
}

// Simple default avatar — gold silhouette on dark background
const DEFAULT_AVATAR =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">' +
    '<rect width="96" height="96" rx="48" fill="#1a1918"/>' +
    '<circle cx="48" cy="36" r="16" fill="#8E6F3E"/>' +
    '<ellipse cx="48" cy="76" rx="28" ry="20" fill="#8E6F3E"/>' +
    '</svg>'
  );

const ACHIEVEMENT_ICONS: Record<string, string> = {
  FIRST_BLOOD: "\u2694\uFE0F",
  WIN_STREAK_X3: "\uD83D\uDD25",
  UNDERDOG: "\uD83D\uDC3A",
  SPEED_CODER: "\u26A1",
  PERFECT_RUN: "\uD83D\uDCAF",
  COMEBACK_KING: "\uD83D\uDC51",
  POLYGLOT: "\uD83C\uDF0D",
  DAILY_GRINDER: "\uD83D\uDCAA",
  TOP_100: "\uD83C\uDFC6",
  LEGEND: "\u2B50",
};

function getRankLabel(elo: number): string {
  if (elo >= 2000) return "GRANDMASTER";
  if (elo >= 1700) return "MASTER";
  if (elo >= 1400) return "DIAMOND";
  if (elo >= 1100) return "GOLD";
  if (elo >= 800) return "SILVER";
  return "BRONZE";
}

export function ProfilePage() {
  const { token } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [topLanguage, setTopLanguage] = useState<LangWinLossEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchProfile() {
      try {
        const [data, achs, langStats] = await Promise.all([
          api<User>("GET", "/api/me", { token: token! }),
          api<Achievement[]>("GET", "/api/me/achievements", { token: token! }),
          api<LanguageStatsResponse>("GET", "/api/me/language-stats", {
            token: token!,
          }),
        ]);
        if (!cancelled) {
          setUser(data);
          setAchievements(achs);
          setTopLanguage(pickTopLanguage(langStats.winLoss));
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return <div className="profile-page"><div className="profile-loading">Loading profile...</div></div>;
  }

  if (error || !user) {
    return <div className="profile-page"><div className="profile-error">{error || "Profile not found"}</div></div>;
  }

  const avatarUrl = user.profile?.avatarUrl || DEFAULT_AVATAR;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <img
          className="profile-avatar"
          src={avatarUrl}
          alt={`${user.username}'s avatar`}
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR; }}
        />

        <span className="profile-username">{user.username}</span>

        <div className="profile-elo-block">
          <span className="profile-elo-value">{user.elo}</span>
          <span className="profile-elo-badge">{getRankLabel(user.elo)}</span>
        </div>

        <p className={`profile-bio ${!user.profile?.bio ? "profile-bio--empty" : ""}`}>
          {user.profile?.bio || "No bio yet"}
        </p>

        {topLanguage && (
          <>
            <div className="profile-divider" />
            <Link to="/language-stats" className="profile-top-language">
              <span className="profile-top-language__label">Top Language</span>
              <span className="profile-top-language__name">
                {LANGUAGE_LABEL[topLanguage.language.toLowerCase()] ?? topLanguage.language}
              </span>
              <span className="profile-top-language__stats">
                {Math.round(topLanguage.winRate * 100)}% win rate
                <span className="profile-top-language__record">
                  {topLanguage.wins}W – {topLanguage.losses}L
                </span>
              </span>
            </Link>
          </>
        )}

        {achievements.length > 0 && (
          <>
            <div className="profile-divider" />
            <div className="profile-achievements">
              <span className="profile-achievements-title">Achievements</span>
              <div className="profile-badges">
                {achievements.map((ach) => (
                  <div key={ach.id} className="profile-badge" title={`${ach.name} — ${new Date(ach.earnedAt).toLocaleDateString()}`}>
                    <span className="profile-badge__icon">
                      {ACHIEVEMENT_ICONS[ach.type] || "\uD83C\uDFC5"}
                    </span>
                    <div className="profile-badge__tooltip">
                      <span className="profile-badge__tooltip-name">{ach.name}</span>
                      <span className="profile-badge__tooltip-desc">{ach.description}</span>
                      <span className="profile-badge__tooltip-date">
                        Earned {new Date(ach.earnedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="profile-divider" />

        <div className="profile-actions">
          <Link to="/profile/edit" className="profile-action-link">Edit Profile</Link>
          <Link to="/change-password" className="profile-action-link">Change Password</Link>
        </div>
      </div>
    </div>
  );
}
