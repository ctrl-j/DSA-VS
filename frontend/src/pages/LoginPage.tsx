import "./LoginPage.css";
import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username.trim()) return setError("Username is required.");
    if (!password) return setError("Password is required.");

    try {
      await login(username.trim(), password);
      navigate("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid login.");
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__brand">DSA·VS</h1>
      <p className="login-page__tagline">competitive algorithms</p>

      <form className="login-form" onSubmit={onSubmit}>
        <div className="login-form__field">
          <label className="login-form__label" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            className="login-form__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="login-form__field">
          <label className="login-form__label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className="login-form__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="login-form__submit">
          Login
        </button>
      </form>

      <p className="login-page__link">
        No account? <Link to="/register">Register</Link>
      </p>

      {error && (
        <div className="login-page__error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
