"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (kind: "student" | "company", body: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<User>("/auth/me"));
    } catch {
      tokenStore.set(null);
      setUser(null);
    }
  }, []);

  // Restore the session from a stored token on first load.
  useEffect(() => {
    const restore = tokenStore.get()
      ? api<User>("/auth/me").then(setUser, () => tokenStore.set(null))
      : Promise.resolve();
    restore.finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token } = await api<{ token: string }>("/auth/login", { method: "POST", body: { email, password } });
    tokenStore.set(token);
    await refresh();
  };

  const register = async (kind: "student" | "company", body: Record<string, unknown>) => {
    const { token } = await api<{ token: string }>(`/auth/register/${kind}`, { method: "POST", body });
    tokenStore.set(token);
    await refresh();
  };

  const logout = () => {
    tokenStore.set(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
