"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearLegacyToken, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (kind: "student" | "company", body: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // The session cookie is httpOnly, so the only way to know who is signed in is to ask the API.
  const refresh = useCallback(async () => {
    try {
      setUser(await api<User>("/auth/me"));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    clearLegacyToken();
    api<User>("/auth/me").then(setUser, () => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    await api("/auth/login", { method: "POST", body: { email, password } });
    await refresh();
  };

  const register = async (kind: "student" | "company", body: Record<string, unknown>) => {
    await api(`/auth/register/${kind}`, { method: "POST", body });
    await refresh();
  };

  const logout = async () => {
    // Clear the local state even if the request fails; the cookie also expires on its own.
    await api("/auth/logout", { method: "POST" }).catch(() => {});
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
