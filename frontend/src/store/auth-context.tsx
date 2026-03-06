import { createContext, useEffect, useMemo, useState } from "react";
import { ApiError } from "../types/api";
import { User } from "../types/models";
import { getMe, login as loginRequest, logout as logoutRequest } from "../features/auth/auth-service";

const KEY = "dsavs-auth";

interface SessionData {
  token: string;
  user: User;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  bannedMessage: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): SessionData | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = loadSession();
  const [user, setUser] = useState<User | null>(initial?.user ?? null);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [loading, setLoading] = useState(false);
  const [bannedMessage, setBannedMessage] = useState<string | null>(null);

  const save = (nextToken: string | null, nextUser: User | null) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken && nextUser) {
      localStorage.setItem(KEY, JSON.stringify({ token: nextToken, user: nextUser }));
    } else {
      localStorage.removeItem(KEY);
    }
  };

  const refreshMe = async () => {
    if (!token) return;
    try {
      const me = await getMe(token);
      save(token, me);
      setBannedMessage(null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Session expired.";
      if (error instanceof ApiError && error.message.toLowerCase().includes("banned")) {
        setBannedMessage(message);
      }
      save(null, null);
    }
  };

  const login = async (username: string, password: string) => {
    const result = await loginRequest(username, password);
    if (result.user.isBanned) {
      throw new ApiError("This account is banned.", "FORBIDDEN", 403);
    }
    save(result.token, result.user);
    setBannedMessage(null);
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutRequest(token);
      } catch {
        // Ignore logout API failures; local session should still clear.
      }
    }
    setBannedMessage(null);
    save(null, null);
  };

  useEffect(() => {
    const run = async () => {
      if (!token) return;
      await refreshMe();
    };
    void run();
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, bannedMessage, login, logout, refreshMe }),
    [user, token, loading, bannedMessage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
