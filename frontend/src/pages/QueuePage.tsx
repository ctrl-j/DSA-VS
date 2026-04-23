import "./QueuePage.css";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWs } from "../providers/WebSocketProvider";
import type { WsMatchFound } from "../types";

type QueuePhase = "idle" | "searching" | "found";

export function QueuePage() {
  const { user } = useAuth();
  const { send, subscribe } = useWs();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<QueuePhase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [matchData, setMatchData] = useState<WsMatchFound | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferredLang, setPreferredLang] = useState(
    () => localStorage.getItem("dsavs-preferred-lang") || "python"
  );

  const handleLangChange = (lang: string) => {
    setPreferredLang(lang);
    localStorage.setItem("dsavs-preferred-lang", lang);
  };
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);

  // Subscribe to match.found
  useEffect(() => {
    const unsub = subscribe("match.found", (payload: WsMatchFound) => {
      setPhase("found");
      setMatchData(payload);
      if (timerRef.current) clearInterval(timerRef.current);

      // Navigate after 2 seconds
      setTimeout(() => {
        navigate(`/match/${payload.matchId}`);
      }, 2000);
    });
    return unsub;
  }, [subscribe, navigate]);

  // Elapsed timer
  useEffect(() => {
    if (phase === "searching") {
      startTimeRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const joinQueue = useCallback(
    (mode: "ranked" | "ffa") => {
      setError(null);
      try {
        send("queue.join", { mode });
        setPhase("searching");
      } catch {
        setError("Failed to join queue.");
      }
    },
    [send],
  );

  const cancelQueue = useCallback(() => {
    send("queue.leave", {});
    setPhase("idle");
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [send]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="queue-page">
      <h1 className="queue-page__title">Queue</h1>
      <div className="queue-page__elo">
        ELO <span className="queue-page__elo-value">{user?.elo ?? "---"}</span>
      </div>

      {phase === "idle" && (
        <>
        <div className="queue-lang-select">
          <label className="queue-lang-label">Preferred Language</label>
          <select
            className="queue-lang-dropdown"
            value={preferredLang}
            onChange={(e) => handleLangChange(e.target.value)}
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>
        <div className="queue-modes">
          <button
            type="button"
            className="queue-mode-card queue-mode-card--ranked"
            onClick={() => joinQueue("ranked")}
          >
            <span className="queue-mode-card__label">Ranked</span>
            <span className="queue-mode-card__sub">Competitive ELO match</span>
            <span className="queue-mode-card__elo-badge">
              {user?.elo ?? "---"} SR
            </span>
          </button>
          <button
            type="button"
            className="queue-mode-card queue-mode-card--ffa"
            onClick={() => joinQueue("ffa")}
          >
            <span className="queue-mode-card__label">Free For All</span>
            <span className="queue-mode-card__sub">Casual match</span>
          </button>
        </div>
        </>
      )}

      {phase === "searching" && (
        <div className="queue-searching">
          <span className="queue-searching__text">Searching...</span>
          <div className="queue-searching__line" />
          <span className="queue-searching__timer">{formatTime(elapsed)}</span>
          <button
            type="button"
            className="queue-searching__cancel"
            onClick={cancelQueue}
          >
            Cancel
          </button>
        </div>
      )}

      {phase === "found" && matchData && (
        <div className="queue-match-found">
          <span className="queue-match-found__title">Match Found</span>
          <div className="queue-match-found__opponent">
            vs{" "}
            <span className="queue-match-found__opponent-name">
              {matchData.opponent.username}
            </span>
            <span className="queue-match-found__opponent-elo">
              {matchData.opponent.elo}
            </span>
          </div>
        </div>
      )}

      {error && <div className="queue-page__error" role="alert">{error}</div>}
    </div>
  );
}
