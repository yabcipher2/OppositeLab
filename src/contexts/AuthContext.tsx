"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: "creator" | "moderator" | "admin";
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not check your session.");
    setUser(result.user);
  }, []);

  useEffect(() => {
    refreshUser().catch(() => setUser(null)).finally(() => setLoading(false));
  }, [refreshUser]);

  const signOut = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Could not sign out.");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, refreshUser, signOut }}>{children}</AuthContext.Provider>;
}
