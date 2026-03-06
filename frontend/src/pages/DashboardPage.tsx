import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user, bannedMessage } = useAuth();

  if (bannedMessage) {
    return <p role="alert">{bannedMessage}</p>;
  }

  return (
    <section>
      <h1>DSA.VS Sprint 1 Frontend</h1>
      {user ? <p>Logged in as {user.username}</p> : <p>Please login or register.</p>}
    </section>
  );
}
