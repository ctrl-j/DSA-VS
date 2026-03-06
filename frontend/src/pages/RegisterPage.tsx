import { FormEvent, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { register } from "../features/auth/auth-service";

export function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!username.trim()) return setError("username required");
    if (!password) return setError("password required");
    if (password.length < 8) return setError("password min length is 8");
    if (password !== confirmPassword) return setError("passwords must match");

    try {
      await register(username.trim(), password);
      setMessage("Account created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Register failed.");
    }
  };

  return (
    <section>
      <h1>Register</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Username" value={username} onChange={setUsername} />
        <TextInput label="Password" value={password} onChange={setPassword} type="password" />
        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
        />
        <button type="submit">Create account</button>
      </form>
      {message && <p>{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
