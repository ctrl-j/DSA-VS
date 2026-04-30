import "./NotificationToast.css";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWs } from "../../providers/WebSocketProvider";

interface NotificationPayload {
  type: "chat_message" | "friend_online" | "friend_offline" | "challenge_received" | "achievement_unlocked";
  title: string;
  body: string;
  data: Record<string, unknown>;
  timestamp: string;
}

const ACHIEVEMENT_NAMES: Record<string, string> = {
  FIRST_BLOOD: "First Blood",
  WIN_STREAK_X3: "Win Streak x3",
  UNDERDOG: "Underdog",
  SPEED_CODER: "Speed Coder",
  PERFECT_RUN: "Perfect Run",
  COMEBACK_KING: "Comeback King",
  POLYGLOT: "Polyglot",
  DAILY_GRINDER: "Daily Grinder",
  TOP_100: "Top 100",
  LEGEND: "Legend",
};

export function NotificationToast() {
  const { subscribe, send } = useWs();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    setNotification(null);
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const unsub = subscribe("notification", (payload: NotificationPayload) => {
      setNotification(payload);
      clearTimeout(timerRef.current);
      // Challenge notifications stay until user acts on them
      if (payload.type !== "challenge_received") {
        timerRef.current = setTimeout(() => setNotification(null), 4000);
      }
    });

    const unsubAch = subscribe("achievements.unlocked", (payload: { achievements: string[] }) => {
      if (!payload.achievements || payload.achievements.length === 0) return;
      const names = payload.achievements.map((t) => ACHIEVEMENT_NAMES[t] || t).join(", ");
      setNotification({
        type: "achievement_unlocked",
        title: "Achievement Unlocked!",
        body: names,
        data: { achievements: payload.achievements },
        timestamp: new Date().toISOString(),
      });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setNotification(null), 5000);
    });

    return () => {
      unsub();
      unsubAch();
      clearTimeout(timerRef.current);
    };
  }, [subscribe]);

  if (!notification) return null;

  const isChallenge = notification.type === "challenge_received";

  const handleAcceptChallenge = (e: React.MouseEvent) => {
    e.stopPropagation();
    const messageId = notification.data.messageId as string;
    send("challenge.accept", { messageId });
    dismiss();
  };

  const handleDeclineChallenge = (e: React.MouseEvent) => {
    e.stopPropagation();
    const messageId = notification.data.messageId as string;
    send("challenge.decline", { messageId });
    dismiss();
  };

  const handleClick = () => {
    // Don't auto-navigate for challenges — user must click Accept or Decline
    if (isChallenge) return;
    dismiss();
    const { type, data } = notification;
    if (type === "chat_message") {
      const username = data.fromUsername as string | undefined;
      if (username) navigate(`/messages?user=${username}`);
    } else if (type === "achievement_unlocked") {
      navigate("/profile");
    }
  };

  const typeClass = `notification-toast--${notification.type.replace("_", "-")}`;

  return (
    <div className={`notification-toast ${typeClass} ${isChallenge ? "notification-toast--interactive" : ""}`} onClick={handleClick}>
      <div className="notification-toast__indicator" />
      <div className="notification-toast__content">
        <div className="notification-toast__title">{notification.title}</div>
        <div className="notification-toast__body">{notification.body}</div>
        {isChallenge && (
          <div className="notification-toast__actions">
            <button className="notification-toast__btn notification-toast__btn--accept" onClick={handleAcceptChallenge}>
              Accept
            </button>
            <button className="notification-toast__btn notification-toast__btn--decline" onClick={handleDeclineChallenge}>
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
