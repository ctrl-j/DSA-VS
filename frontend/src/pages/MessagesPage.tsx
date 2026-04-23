import "./MessagesPage.css";
import { useState, useEffect, useRef, useCallback, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useWs } from "../providers/WebSocketProvider";
import { api } from "../services/api";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

export function MessagesPage() {
  const { token, user } = useAuth();
  const { send: wsSend, subscribe } = useWs();
  const location = useLocation();

  // Target user from navigation state (from friends panel) or manual input
  const initialTarget = (location.state as { targetUsername?: string })?.targetUsername ?? "";
  const [targetInput, setTargetInput] = useState(initialTarget);
  const [activeTarget, setActiveTarget] = useState(initialTarget);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation history
  const loadConversation = useCallback(async (username: string) => {
    if (!token || !username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api<Message[]>("GET", `/api/chats/${username.trim()}/messages`, { token });
      setMessages(data);
      setActiveTarget(username.trim());
    } catch (e: any) {
      setError(e.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load initial target if provided from navigation
  useEffect(() => {
    if (initialTarget) {
      loadConversation(initialTarget);
    }
  }, [initialTarget, loadConversation]);

  // Subscribe to incoming messages via WebSocket
  useEffect(() => {
    const unsub = subscribe("chat.received", (payload: {
      fromUserId: string;
      messageId: string;
      content: string;
      createdAt: string;
    }) => {
      // Add to messages if it's from/to the active conversation
      if (!user) return;

      const newMsg: Message = {
        id: payload.messageId,
        senderId: payload.fromUserId,
        receiverId: user.id,
        content: payload.content,
        createdAt: payload.createdAt,
      };

      setMessages((prev) => [...prev, newMsg]);
    });

    return unsub;
  }, [subscribe, user, activeTarget]);

  // Send message
  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !activeTarget || !content.trim()) return;
    setError(null);

    // Send via WebSocket for real-time delivery
    wsSend("chat.send", { toUsername: activeTarget, content: content.trim() });

    // Optimistically add to local messages
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: user!.id,
      receiverId: "",
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setContent("");
  };

  const handleOpenConversation = () => {
    if (targetInput.trim()) {
      loadConversation(targetInput.trim());
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="messages-page">
      {/* Target selector */}
      <div className="messages-target">
        <input
          className="messages-target__input"
          type="text"
          placeholder="Enter username to message"
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleOpenConversation(); }}
        />
        <button
          className="messages-target__btn"
          type="button"
          onClick={handleOpenConversation}
        >
          Open
        </button>
      </div>

      {activeTarget && (
        <>
          <div className="messages-header">
            <span className="messages-header__name">{activeTarget}</span>
            <span className="messages-header__status">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Message list */}
          <div className="messages-list" ref={listRef}>
            {loading && <div className="messages-empty">Loading...</div>}
            {!loading && messages.length === 0 && (
              <div className="messages-empty">No messages yet. Say hello!</div>
            )}
            {messages.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`messages-bubble ${isMe ? "messages-bubble--me" : "messages-bubble--them"}`}
                >
                  {msg.content}
                  <div className="messages-bubble__time">{formatTime(msg.createdAt)}</div>
                </div>
              );
            })}
          </div>

          {/* Compose */}
          <form className="messages-compose" onSubmit={handleSend}>
            <input
              className="messages-compose__input"
              type="text"
              placeholder="Type a message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="messages-compose__send"
              disabled={!content.trim()}
            >
              Send
            </button>
          </form>
        </>
      )}

      {error && <div className="messages-error">{error}</div>}
    </div>
  );
}
