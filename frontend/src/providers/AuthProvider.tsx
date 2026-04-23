import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api } from "../services/api";
import type { User, LoginResponse } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "dsavs-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.user) {
          setToken(parsed.token);
          setUser(parsed.user);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persist = (t: string, u: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: t, user: u }));
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  const login = useCallback(async (username: string, password: string) => {
    const data = await api<LoginResponse>("POST", "/api/auth/login", {
      body: { username, password },
    });
    setToken(data.token);
    setUser(data.user);
    persist(data.token, data.user);
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try {
        await api("POST", "/api/auth/logout", { token });
      } catch {
        // ignore logout errors
      }
    }
    clear();
  }, [token]);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api<User>("GET", "/api/me", { token });
      setUser(data);
      persist(token, data);
    } catch {
      clear();
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
