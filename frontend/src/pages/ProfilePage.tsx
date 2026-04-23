import "./ProfilePage.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { User } from "../types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function fetchProfile() {
      try {
        const data = await api<User>("GET", "/api/me", { token: token! });
        if (!cancelled) setUser(data);
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

        <div className="profile-divider" />

        <div className="profile-actions">
          <Link to="/profile/edit" className="profile-action-link">Edit Profile</Link>
          <Link to="/change-password" className="profile-action-link">Change Password</Link>
        </div>
      </div>
    </div>
  );
}
