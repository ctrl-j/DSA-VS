import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { joinQueue, leaveQueue, queueState } from "../features/queue/queue-service";
import { QueueState } from "../types/models";

const emptyState: QueueState = { mode: null, queued: false };

export function QueuePage() {
  const { user } = useAuth();
  const [state, setState] = useState<QueueState>(emptyState);
  const [error, setError] = useState<string | null>(null);
  const [matchPopup, setMatchPopup] = useState<string | null>(null);
  const manualLeaveRef = useRef(false);
  const prevQueuedRef = useRef(false);

  const load = async (silent = false) => {
    if (!user) return;
    try {
      const next = await queueState(user.username);
      if (prevQueuedRef.current && !next.queued && !manualLeaveRef.current) {
        setMatchPopup("Matched! You have been paired.");
      }
      manualLeaveRef.current = false;
      prevQueuedRef.current = next.queued;
      setState(next);
    } catch {
      if (!silent) setState(emptyState);
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), 1000);
    return () => clearInterval(timer);
  }, [user?.username]);

  const join = async (mode: "ranked" | "ffa") => {
    if (!user) return;
    setError(null);
    try {
      const result = await joinQueue(user.username, mode);
      if (result.pair) {
        const opponent = result.pair.users.find((candidate) => candidate.userId !== user.id);
        setMatchPopup(
          opponent ? `Matched! You are paired with ${opponent.username}.` : "Matched! You have been paired."
        );
        setState(emptyState);
        prevQueuedRef.current = false;
        return;
      }

      const nextState: QueueState = {
        queued: true,
        mode,
        position: result.position ?? 1,
      };
      setState(nextState);
      prevQueuedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue join failed.");
    }
  };

  const leave = async () => {
    if (!user) return;
    setError(null);
    try {
      manualLeaveRef.current = true;
      await leaveQueue(user.username);
      setState(emptyState);
      prevQueuedRef.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Queue leave failed.");
    }
  };

  return (
    <section>
      <h1>Queue</h1>
      <p>
        Queued: {state.queued ? "Yes" : "No"} | Mode: {state.mode ?? "none"}
      </p>
      <button type="button" onClick={() => void join("ranked")}>Join ranked</button>
      <button type="button" onClick={() => void join("ffa")}>Join FFA</button>
      <button type="button" onClick={() => void leave()}>Leave queue</button>
      {error && <p role="alert">{error}</p>}
      {matchPopup && (
        <div role="alert">
          <p>{matchPopup}</p>
          <button type="button" onClick={() => setMatchPopup(null)}>Close</button>
        </div>
      )}
    </section>
  );
}
