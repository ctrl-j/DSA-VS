import "./ChangePasswordPage.css";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";

export function ChangePasswordPage() {
  const { token } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);

    if (!oldPassword || !newPassword) return setError("All password fields are required.");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");

    try {
      await api("PATCH", "/api/me/password", {
        token,
        body: { oldPassword, newPassword },
      });
      setMessage("Password changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e.message || "Password change failed.");
    }
  };

  return (
    <div className="change-pw-page">
      <h1 className="change-pw-title">Change Password</h1>
      <form className="change-pw-form" onSubmit={onSubmit}>
        <div className="change-pw-field">
          <label className="change-pw-label">Current Password</label>
          <input
            className="change-pw-input"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>
        <div className="change-pw-field">
          <label className="change-pw-label">New Password</label>
          <input
            className="change-pw-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="change-pw-field">
          <label className="change-pw-label">Confirm New Password</label>
          <input
            className="change-pw-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="change-pw-submit">Update Password</button>
      </form>
      {message && <p className="change-pw-message">{message}</p>}
      {error && <p className="change-pw-error" role="alert">{error}</p>}
      <Link to="/profile" className="change-pw-back">Back to profile</Link>
    </div>
  );
}
