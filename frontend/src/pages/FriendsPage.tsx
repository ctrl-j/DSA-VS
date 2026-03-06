import { FormEvent, useEffect, useState } from "react";
import { TextInput } from "../components/forms/TextInput";
import { StatusBox } from "../components/StatusBox";
import { useAuth } from "../hooks/useAuth";
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getPendingFriendRequests,
  removeFriend,
  sendFriendRequest,
} from "../features/friends/friends-service";
import { PublicUser } from "../types/models";

export function FriendsPage() {
  const { token } = useAuth();
  const [username, setUsername] = useState("");
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [pending, setPending] = useState<Awaited<ReturnType<typeof getPendingFriendRequests>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (withSpinner = true) => {
    if (!token) return;
    if (withSpinner) setLoading(true);
    try {
      const [data, incoming] = await Promise.all([getFriends(token), getPendingFriendRequests(token)]);
      setFriends(data.friends);
      setPending(incoming);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load friends.");
    } finally {
      if (withSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (!token) return;
    const timer = setInterval(() => {
      void load(false);
    }, 500);
    return () => clearInterval(timer);
  }, [token]);

  const onSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);
    if (!username.trim()) return setError("username required");
    try {
      await sendFriendRequest(token, username.trim());
      setMessage("Friend request pending.");
      setUsername("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send request.");
    }
  };

  return (
    <section>
      <h1>Friends</h1>
      <form onSubmit={onSend}>
        <TextInput label="Friend username" value={username} onChange={setUsername} />
        <button type="submit">Send request</button>
      </form>
      <StatusBox loading={loading} error={error} empty={false} />
      {message && <p>{message}</p>}
      {friends.length === 0 ? (
        <p>No friends yet.</p>
      ) : (
        <ul>
          {friends.map((friend) => (
            <li key={friend.id}>
              {friend.username}
              <button type="button" onClick={() => void removeFriend(token!, friend.username).then(load)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2>Incoming Friend Requests</h2>
      {pending.length === 0 ? (
        <p>No incoming requests.</p>
      ) : (
        <ul>
          {pending.map((request) => (
            <li key={request.id}>
              {request.requester.username}
              <button
                type="button"
                onClick={() =>
                  void acceptFriendRequest(token!, request.id)
                    .then(() => load(false))
                    .catch((e: Error) => setError(e.message))
                }
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() =>
                  void declineFriendRequest(token!, request.id)
                    .then(() => load(false))
                    .catch((e: Error) => setError(e.message))
                }
              >
                Decline
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
