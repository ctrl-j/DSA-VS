import { FormEvent, useEffect, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import { blockUser, getBlocked, unblockUser } from "../features/blocked/blocked-service";
import { PublicUser } from "../types/models";

export function BlockedPage() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [blocked, setBlocked] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setBlocked(await getBlocked(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load blocked users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !username.trim()) return;
    try {
      await blockUser(token, username.trim());
      setUsername("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Block failed.");
    }
  };

  return (
    <section>
      <h1>Blocked Users</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Username to block" value={username} onChange={setUsername} />
        <button type="submit">Block</button>
      </form>
      <StatusBox loading={loading} error={error} empty={blocked.length === 0} emptyText="No blocked users." />
      {blocked.length > 0 && (
        <ul>
          {blocked.map((item) => (
            <li key={item.id}>
              {item.username}
              <button type="button" onClick={() => void unblockUser(token!, item.username).then(load)}>
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
