import "./EditProfilePage.css";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { User } from "../types";

export function EditProfilePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const user = await api<User>("GET", "/api/me", { token: token! });
        if (!cancelled) {
          setBio(user.profile?.bio ?? "");
          setAvatarUrl(user.profile?.avatarUrl ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load profile");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (avatarUrl && !/^https?:\/\//.test(avatarUrl)) {
      return setError("Avatar URL must start with http:// or https://");
    }

    try {
      await api("PATCH", "/api/me/profile", { token, body: { bio, avatarUrl } });
      setMessage("Profile saved.");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (e: any) {
      setError(e.message || "Profile update failed.");
    }
  };

  return (
    <div className="edit-profile-page">
      <h1 className="edit-profile-title">Edit Profile</h1>
      <form className="edit-profile-form" onSubmit={onSubmit}>
        <div className="edit-profile-field">
          <label className="edit-profile-label">Bio</label>
          <textarea
            className="edit-profile-textarea"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            maxLength={500}
          />
        </div>
        <div className="edit-profile-field">
          <label className="edit-profile-label">Avatar URL</label>
          <input
            className="edit-profile-input"
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
        </div>
        <button type="submit" className="edit-profile-submit">Save</button>
      </form>
      {message && <p className="edit-profile-message">{message}</p>}
      {error && <p className="edit-profile-error" role="alert">{error}</p>}
      <Link to="/profile" className="edit-profile-back">Back to profile</Link>
    </div>
  );
}
