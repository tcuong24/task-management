"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import * as authService from "../services/auth";

interface AuthContextType {
  user: authService.UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
    redirectTo?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<authService.UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await authService.getMe();
      setUser(data.user);
      setError(null);
    } catch (err: any) {
      setUser(null);
      // Don't treat a 401 as a hard error page-wise, just means guest
      if (err.status !== 401) {
        setError(err.message || "Failed to authenticate.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch profile on initial load
    fetchUser();
  }, []);

  const login = async (
    username: string,
    password: string,
    rememberMe = false,
    redirectTo = "/dashboard",
  ) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.login(username, password, rememberMe);
      setUser(data.user);
      if (redirectTo !== "/dashboard") {
        router.push(redirectTo);
      } else if (data.user.platformRole === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setLoading(false);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, logout, fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
