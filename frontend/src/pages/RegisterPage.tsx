import "./RegisterPage.css";
import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!username.trim()) return setError("Username is required.");
    if (!USERNAME_RE.test(username.trim())) {
      return setError(
        "Username must be 3-20 characters, alphanumeric and underscores only.",
      );
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    try {
      await api("POST", "/api/auth/register", {
        body: { username: username.trim(), password },
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    }
  };

  return (
    <div className="register-page">
      <h1 className="register-page__brand">DSA·VS</h1>
      <p className="register-page__tagline">create your account</p>

      <form className="register-form" onSubmit={onSubmit}>
        <div className="register-form__field">
          <label className="register-form__label" htmlFor="reg-username">
            Username
          </label>
          <input
            id="reg-username"
            className="register-form__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <span className="register-form__hint">
            3-20 characters, letters, numbers, underscores
          </span>
        </div>

        <div className="register-form__field">
          <label className="register-form__label" htmlFor="reg-password">
            Password
          </label>
          <input
            id="reg-password"
            className="register-form__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <span className="register-form__hint">Minimum 8 characters</span>
        </div>

        <div className="register-form__field">
          <label className="register-form__label" htmlFor="reg-confirm">
            Confirm Password
          </label>
          <input
            id="reg-confirm"
            className="register-form__input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="register-form__submit">
          Register
        </button>
      </form>

      <p className="register-page__link">
        Already have an account? <Link to="/login">Login</Link>
      </p>

      {success && (
        <div className="register-page__success">
          Account created. Redirecting to login...
        </div>
      )}

      {error && (
        <div className="register-page__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
