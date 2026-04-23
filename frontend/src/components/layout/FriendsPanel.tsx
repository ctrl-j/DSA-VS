import "./FriendsPanel.css";
import { useState, useEffect, useCallback, useRef, type FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useWs } from "../../providers/WebSocketProvider";
import { api } from "../../services/api";

interface Friend {
  id: string;
  username: string;
  elo: number;
}

interface PendingRequest {
  id: string;
  requesterId: string;
  receiverId: string;
  requester?: { id: string; username: string };
  receiver?: { id: string; username: string };
  status: string;
}

interface FriendsResponse {
  friends: Friend[];
  blocked: unknown[];
}

interface ContextMenu {
  x: number;
  y: number;
  friend: Friend;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

type PanelView = "friends" | "chat";

export function FriendsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token, user } = useAuth();
  const { send: wsSend, subscribe } = useWs();

  const [view, setView] = useState<PanelView>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Add friend
  const [addUsername, setAddUsername] = useState("");
  const [addStatus, setAddStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  // Chat state
  const [chatTarget, setChatTarget] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);

  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch friends
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [friendsData, pendingData] = await Promise.all([
        api<FriendsResponse>("GET", "/api/friends", { token }),
        api<PendingRequest[]>("GET", "/api/friends/requests/pending", { token }),
      ]);
      setFriends(friendsData.friends);
      setPending(pendingData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (open) {
      fetchData();
      setView("friends");
      setChatTarget(null);
    }
  }, [open, fetchData]);

  // Close context menu on click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu) setContextMenu(null);
        else if (view === "chat") { setView("friends"); setChatTarget(null); }
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, contextMenu, view]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  // Notification state
  const [notification, setNotification] = useState<{ from: string; content: string } | null>(null);
  const notificationTimer = useRef<ReturnType<typeof setTimeout>>();

  // Subscribe to incoming chat messages
  useEffect(() => {
    const unsub = subscribe("chat.received", (payload: {
      fromUserId: string;
      messageId: string;
      content: string;
      createdAt: string;
    }) => {
      if (!user) return;

      // Skip echo of our own messages (we already added them optimistically)
      if (payload.fromUserId === user.id) return;

      const newMsg: ChatMessage = {
        id: payload.messageId,
        senderId: payload.fromUserId,
        content: payload.content,
        createdAt: payload.createdAt,
      };

      // Add to chat if we're in a conversation with this user
      setMessages((prev) => [...prev, newMsg]);

      // Show notification if panel is closed or we're on the friends list
      const senderFriend = friends.find((f) => f.id === payload.fromUserId);
      const senderName = senderFriend?.username ?? "Someone";

      if (!open || view !== "chat" || chatTarget?.id !== payload.fromUserId) {
        setNotification({ from: senderName, content: payload.content });
        clearTimeout(notificationTimer.current);
        notificationTimer.current = setTimeout(() => setNotification(null), 4000);
      }
    });
    return unsub;
  }, [subscribe, user, open, view, chatTarget, friends]);

  // Open chat with a friend
  const openChat = useCallback(async (friend: Friend) => {
    setContextMenu(null);
    setChatTarget(friend);
    setView("chat");
    setChatInput("");
    setChatLoading(true);
    try {
      const data = await api<ChatMessage[]>("GET", `/api/chats/${friend.username}/messages`, { token: token! });
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  }, [token]);

  // Send chat message
  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatTarget || !chatInput.trim() || !user) return;

    wsSend("chat.send", { toUsername: chatTarget.username, content: chatInput.trim() });

    // Optimistic add
    setMessages((prev) => [...prev, {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      content: chatInput.trim(),
      createdAt: new Date().toISOString(),
    }]);
    setChatInput("");
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, friend: Friend) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, friend });
  };

  const handleBlock = async (friend: Friend) => {
    setContextMenu(null);
    if (!token) return;
    try {
      await api("POST", "/api/blocks", { token, body: { blockedUsername: friend.username } });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleRemove = async (friend: Friend) => {
    setContextMenu(null);
    if (!token) return;
    try {
      await api("DELETE", `/api/friends/${friend.username}`, { token });
      setFriends((prev) => prev.filter((f) => f.id !== friend.id));
    } catch { /* ignore */ }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!token) return;
    try {
      await api("POST", `/api/friends/requests/${requestId}/accept`, { token });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDeclineRequest = async (requestId: string) => {
    if (!token) return;
    try {
      await api("POST", `/api/friends/requests/${requestId}/decline`, { token });
      setPending((prev) => prev.filter((p) => p.id !== requestId));
    } catch { /* ignore */ }
  };

  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !addUsername.trim()) return;
    setAddStatus(null);
    try {
      await api("POST", "/api/friends/requests", { token, body: { receiverUsername: addUsername.trim() } });
      setAddStatus({ msg: "Request sent!", ok: true });
      setAddUsername("");
    } catch (err: any) {
      setAddStatus({ msg: err.message || "Failed", ok: false });
    }
  };

  const getInitial = (username: string) => username.charAt(0).toUpperCase();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      <div
        className={`friends-panel-backdrop ${open ? "friends-panel-backdrop--open" : ""}`}
        onClick={onClose}
      />
      <div ref={panelRef} className={`friends-panel ${open ? "friends-panel--open" : ""}`}>

        {/* ===== FRIENDS LIST VIEW ===== */}
        {view === "friends" && (
          <>
            <div className="friends-panel__header">
              <span className="friends-panel__title">Friends</span>
              <button className="friends-panel__close" onClick={onClose}>&#x2715;</button>
            </div>

            {pending.length > 0 && (
              <div className="friends-panel__pending">
                <div className="friends-panel__pending-title">Pending ({pending.length})</div>
                {pending.map((req) => (
                  <div key={req.id} className="friends-panel__pending-item">
                    <span className="friends-panel__pending-name">{req.requester?.username ?? "Unknown"}</span>
                    <div className="friends-panel__pending-actions">
                      <button className="friends-panel__pending-btn friends-panel__pending-btn--accept" onClick={() => handleAcceptRequest(req.id)}>Accept</button>
                      <button className="friends-panel__pending-btn friends-panel__pending-btn--decline" onClick={() => handleDeclineRequest(req.id)}>Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="friends-panel__list">
              <div className="friends-panel__section-label">Friends {!loading && `(${friends.length})`}</div>
              {friends.length === 0 && !loading && (
                <div className="friends-panel__empty">No friends yet. Add someone below!</div>
              )}
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="friends-panel__item"
                  onClick={() => openChat(friend)}
                  onContextMenu={(e) => handleContextMenu(e, friend)}
                >
                  <div className="friends-panel__item-avatar">{getInitial(friend.username)}</div>
                  <div className="friends-panel__item-info">
                    <div className="friends-panel__item-name">{friend.username}</div>
                    <div className="friends-panel__item-elo">{friend.elo} ELO</div>
                  </div>
                  <div className="friends-panel__item-actions">
                    <button
                      className="friends-panel__action-btn"
                      title="Chat"
                      onClick={(e) => { e.stopPropagation(); openChat(friend); }}
                    >
                      Chat
                    </button>
                    <button
                      className="friends-panel__action-btn friends-panel__action-btn--more"
                      title="More"
                      onClick={(e) => { e.stopPropagation(); handleContextMenu(e, friend); }}
                    >
                      &hellip;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="friends-panel__add">
              <form className="friends-panel__add-form" onSubmit={handleAddFriend}>
                <input className="friends-panel__add-input" type="text" placeholder="Add friend by username" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} />
                <button type="submit" className="friends-panel__add-btn">Add</button>
              </form>
              {addStatus && (
                <div className={`friends-panel__add-status ${addStatus.ok ? "friends-panel__add-status--success" : "friends-panel__add-status--error"}`}>{addStatus.msg}</div>
              )}
            </div>
          </>
        )}

        {/* ===== CHAT VIEW ===== */}
        {view === "chat" && chatTarget && (
          <>
            <div className="friends-panel__header">
              <button className="friends-panel__back" onClick={() => { setView("friends"); setChatTarget(null); }}>
                &#x2190;
              </button>
              <span className="friends-panel__title">{chatTarget.username}</span>
              <button className="friends-panel__close" onClick={onClose}>&#x2715;</button>
            </div>

            <div className="friends-panel__chat-list" ref={chatListRef}>
              {chatLoading && <div className="friends-panel__chat-empty">Loading...</div>}
              {!chatLoading && messages.length === 0 && (
                <div className="friends-panel__chat-empty">No messages yet</div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`friends-panel__chat-bubble ${isMe ? "friends-panel__chat-bubble--me" : "friends-panel__chat-bubble--them"}`}>
                    <div className="friends-panel__chat-text">{msg.content}</div>
                    <div className="friends-panel__chat-time">{formatTime(msg.createdAt)}</div>
                  </div>
                );
              })}
            </div>

            <form className="friends-panel__chat-compose" onSubmit={handleSendChat}>
              <input
                className="friends-panel__chat-input"
                type="text"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                autoFocus
              />
              <button type="submit" className="friends-panel__chat-send" disabled={!chatInput.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div className="friends-panel__context" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button className="friends-panel__context-item" onClick={() => openChat(contextMenu.friend)}>Message</button>
          <button className="friends-panel__context-item friends-panel__context-item--danger" onClick={() => handleBlock(contextMenu.friend)}>Block</button>
          <button className="friends-panel__context-item friends-panel__context-item--danger" onClick={() => handleRemove(contextMenu.friend)}>Remove Friend</button>
        </div>
      )}

      {/* Message notification toast */}
      {notification && (
        <div className="friends-panel__toast" onClick={() => {
          setNotification(null);
          // Open the panel and chat if we can find the friend
          const friend = friends.find((f) => f.username === notification.from);
          if (friend) openChat(friend);
        }}>
          <div className="friends-panel__toast-from">{notification.from}</div>
          <div className="friends-panel__toast-content">{notification.content}</div>
        </div>
      )}
    </>
  );
}
