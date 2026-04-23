import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";

interface WsContextValue {
  connected: boolean;
  send: (event: string, payload?: unknown) => void;
  subscribe: (event: string, handler: (payload: any) => void) => () => void;
}

const WsContext = createContext<WsContextValue | null>(null);

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000/ws";
const RECONNECT_DELAY = 2000;

export function WebSocketProvider({ token, children }: { token: string | null; children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef(new Map<string, Set<(payload: any) => void>>());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (!token) return;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const handlers = listenersRef.current.get(msg.event);
        if (handlers) {
          for (const handler of handlers) {
            handler(msg.payload);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect if we still have a token
      if (token) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((event: string, payload?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, payload: payload ?? {} }));
    }
  }, []);

  const subscribe = useCallback((event: string, handler: (payload: any) => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = listenersRef.current.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    };
  }, []);

  return (
    <WsContext.Provider value={{ connected, send, subscribe }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs(): WsContextValue {
  const ctx = useContext(WsContext);
  if (!ctx) {
    throw new Error("useWs must be used within WebSocketProvider");
  }
  return ctx;
}
