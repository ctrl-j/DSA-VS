import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextInput } from "../components/forms/TextInput";
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

    if (!username.trim()) return setError("username required");
    if (!password) return setError("password required");

    try {
      await login(username.trim(), password);
      navigate("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : "invalid login");
    }
  };

  return (
    <section>
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Username" value={username} onChange={setUsername} />
        <TextInput label="Password" value={password} onChange={setPassword} type="password" />
        <button type="submit">Login</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
