import "./PrivateMatchPage.css";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWs } from "../providers/WebSocketProvider";
import { api, ApiError } from "../services/api";

type Lobby = {
  id: string;
  roomName: string;
  createdAt: string;
  hostUsername: string;
  playerCount: number;
};

type JoinValidation = {
  lobbyMatchId: string;
  hostUserId: string;
};

export function PrivateMatchPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { send, subscribe } = useWs();

  // Navigate to match when match.found is received (works for both host and joiner)
  useEffect(() => {
    return subscribe("match.found", (payload: { matchId?: string }) => {
      if (payload.matchId) {
        navigate(`/match/${payload.matchId}`);
      }
    });
  }, [subscribe, navigate]);

  // Create lobby state
  const [createRoomName, setCreateRoomName] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join lobby state
  const [joinRoomName, setJoinRoomName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Open lobbies state
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbiesLoading, setLobbiesLoading] = useState(true);
  const [lobbiesError, setLobbiesError] = useState<string | null>(null);

  // Fetch open lobbies
  const fetchLobbies = useCallback(() => {
    if (!token) return;
    setLobbiesError(null);
    api<Lobby[]>("GET", "/api/matches/private/lobbies", { token })
      .then((data) => setLobbies(data))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load lobbies";
        setLobbiesError(message);
      })
      .finally(() => setLobbiesLoading(false));
  }, [token]);

  // Initial fetch + auto-refresh every 10 seconds
  useEffect(() => {
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 10_000);
    return () => clearInterval(interval);
  }, [fetchLobbies]);

  // Create lobby handler
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      await api("POST", "/api/matches/private", {
        token,
        body: { roomName: createRoomName, password: createPassword },
      });
      setCreateSuccess(createRoomName);
      setCreateRoomName("");
      setCreatePassword("");
      fetchLobbies();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create lobby";
      setCreateError(message);
    } finally {
      setCreateLoading(false);
    }
  }

  // Join lobby handler — validate via REST, then start match via WS
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const result = await api<JoinValidation>("POST", "/api/matches/private/join", {
        token,
        body: { roomName: joinRoomName, password: joinPassword },
      });

      // Password validated — send WS event to create the match (like challenge.accept)
      send("private.join", {
        lobbyMatchId: result.lobbyMatchId,
        hostUserId: result.hostUserId,
      });

      setJoinSuccess("Joining match...");
      setJoinRoomName("");
      setJoinPassword("");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.code === "INVALID_PASSWORD" || err.message.toLowerCase().includes("password")) {
          setJoinError("Invalid password");
        } else if (err.code === "NOT_FOUND" || err.message.toLowerCase().includes("not found")) {
          setJoinError("Room not found");
        } else {
          setJoinError(err.message);
        }
      } else {
        const message =
          err instanceof Error ? err.message : "Failed to join lobby";
        setJoinError(message);
      }
    } finally {
      setJoinLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="pm-page">
        <h1 className="pm__title">Private Match</h1>
        <p className="pm__auth-message">Please login to access private matches.</p>
      </div>
    );
  }

  return (
    <div className="pm-page">
      <h1 className="pm__title">Private Match</h1>

      <div className="pm__forms-row">
        {/* Section 1: Create a Lobby */}
        <div className="pm__panel">
          <h2 className="pm__panel-title">Create a Lobby</h2>
          <form className="pm__form" onSubmit={handleCreate}>
            <label className="pm__field">
              <span className="pm__field-label">Room Name</span>
              <input
                className="pm__input"
                type="text"
                value={createRoomName}
                onChange={(e) => setCreateRoomName(e.target.value)}
                placeholder="Enter room name"
                required
              />
            </label>
            <label className="pm__field">
              <span className="pm__field-label">Password</span>
              <input
                className="pm__input"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </label>
            <button
              className="pm__button"
              type="submit"
              disabled={createLoading || !createRoomName || !createPassword}
            >
              {createLoading ? "Creating..." : "Create"}
            </button>
          </form>
          {createSuccess && (
            <div className="pm__success">
              Lobby created! Room: {createSuccess}
            </div>
          )}
          {createError && <div className="pm__error">{createError}</div>}
        </div>

        {/* Section 2: Join a Lobby */}
        <div className="pm__panel">
          <h2 className="pm__panel-title">Join a Lobby</h2>
          <form className="pm__form" onSubmit={handleJoin}>
            <label className="pm__field">
              <span className="pm__field-label">Room Name</span>
              <input
                className="pm__input"
                type="text"
                value={joinRoomName}
                onChange={(e) => setJoinRoomName(e.target.value)}
                placeholder="Enter room name"
                required
              />
            </label>
            <label className="pm__field">
              <span className="pm__field-label">Password</span>
              <input
                className="pm__input"
                type="password"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
            </label>
            <button
              className="pm__button"
              type="submit"
              disabled={joinLoading || !joinRoomName || !joinPassword}
            >
              {joinLoading ? "Joining..." : "Join"}
            </button>
          </form>
          {joinSuccess && <div className="pm__success">{joinSuccess}</div>}
          {joinError && <div className="pm__error">{joinError}</div>}
        </div>
      </div>

      {/* Section 3: Open Lobbies */}
      <div className="pm__lobbies">
        <h2 className="pm__panel-title">Open Lobbies</h2>
        {lobbiesLoading && (
          <div className="pm__loading">Loading lobbies...</div>
        )}
        {lobbiesError && <div className="pm__error">{lobbiesError}</div>}
        {!lobbiesLoading && !lobbiesError && lobbies.length === 0 && (
          <div className="pm__empty">No open lobbies</div>
        )}
        {!lobbiesLoading && !lobbiesError && lobbies.length > 0 && (
          <div className="pm__table-wrapper">
            <table className="pm__table">
              <thead>
                <tr>
                  <th className="pm__th">Room Name</th>
                  <th className="pm__th">Host</th>
                  <th className="pm__th">Players</th>
                  <th className="pm__th">Created</th>
                </tr>
              </thead>
              <tbody>
                {lobbies.map((lobby) => (
                  <tr key={lobby.id} className="pm__tr">
                    <td className="pm__td pm__td--name">{lobby.roomName}</td>
                    <td className="pm__td">{lobby.hostUsername}</td>
                    <td className="pm__td pm__td--center">{lobby.playerCount}</td>
                    <td className="pm__td pm__td--muted">
                      {new Date(lobby.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
