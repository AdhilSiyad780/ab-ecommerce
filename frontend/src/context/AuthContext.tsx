import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { endpoints, setTokens, clearTokens } from "../api/client";

interface AuthUser {
  name: string;
  mobile: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  login: (mobile: string, password: string) => Promise<void>;
  signup: (name: string, mobile: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Minimal JWT payload decode — no verification needed client-side,
// the server verifies the signature on every request anyway.
function decodeJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const access = localStorage.getItem("fc_access");
    if (access) {
      const payload = decodeJwt(access);
      if (payload) setUser({ name: payload.name, mobile: payload.mobile ?? payload.sub, role: payload.role });
    }
  }, []);

  async function login(mobile: string, password: string) {
    const { access, refresh } = await endpoints.login(mobile, password);
    setTokens(access, refresh);
    const payload = decodeJwt(access);
    setUser({ name: payload.name, mobile: payload.mobile ?? mobile, role: payload.role });
  }

  async function signup(name: string, mobile: string, password: string, email?: string) {
    await endpoints.signup(name, mobile, password, email);
    await login(mobile, password);
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  const isAdmin = !!user && user.role !== "CUSTOMER";

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
