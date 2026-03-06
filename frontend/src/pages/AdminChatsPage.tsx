import { FormEvent, useMemo, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import { getAdminChats } from "../features/admin/admin-service";
import { AdminChatMessage } from "../types/models";

export function AdminChatsPage() {
  const { token } = useAuth();
  const [username1, setUsername1] = useState("");
  const [username2, setUsername2] = useState("");
  const [filter, setFilter] = useState("");
  const [rows, setRows] = useState<AdminChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (!username1.trim() || !username2.trim()) {
      setError("Both usernames are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRows(await getAdminChats(token, username1.trim(), username2.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch chats.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const query = filter.toLowerCase();
    return rows.filter((row) => row.content.toLowerCase().includes(query));
  }, [rows, filter]);

  return (
    <section>
      <h1>Admin Chats</h1>
      <form onSubmit={onSubmit}>
        <TextInput label="Username 1" value={username1} onChange={setUsername1} />
        <TextInput label="Username 2" value={username2} onChange={setUsername2} />
        <TextInput label="Search" value={filter} onChange={setFilter} />
        <button type="submit">Load chats</button>
      </form>
      <StatusBox loading={loading} error={error} empty={filtered.length === 0} emptyText="No chats." />
      {filtered.length > 0 && (
        <ul>
          {filtered.map((chat) => (
            <li key={chat.id}>{chat.sender.username}: {chat.content}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
