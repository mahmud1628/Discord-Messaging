import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  AUTH_UNAUTHORIZED_EVENT,
  loginUser,
  logoutUser,
  registerUser,
} from "../utils/api";

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  displayName: string;
  dateOfBirth: string;
}

const getJwtExpiryEpochMs = (token: string) => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const payloadRaw = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const payloadJson = JSON.parse(atob(payloadRaw));
    const exp = Number(payloadJson?.exp);

    if (!Number.isFinite(exp)) {
      return null;
    }

    return exp * 1000;
  } catch (_error) {
    return null;
  }
};

const isJwtExpired = (token: string) => {
  const expiryMs = getJwtExpiryEpochMs(token);
  if (!expiryMs) {
    return true;
  }

  return expiryMs <= Date.now();
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const clearSession = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedToken && isJwtExpired(storedToken)) {
      clearSession();
      setIsLoading(false);
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (storedToken) {
      setToken(storedToken);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const expiryMs = getJwtExpiryEpochMs(token);
    if (!expiryMs) {
      clearSession();
      navigate("/login");
      return;
    }

    const remainingMs = expiryMs - Date.now();
    if (remainingMs <= 0) {
      clearSession();
      navigate("/login");
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearSession();
      navigate("/login");
    }, remainingMs + 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [token, navigate]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      navigate("/login");
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [navigate]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await loginUser(identifier, password);

      const authenticatedUser: User = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        username: response.data.user.username,
        displayName:
          response.data.user.displayName || response.data.user.username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.data.user.username}`,
      };

      localStorage.setItem("user", JSON.stringify(authenticatedUser));
      localStorage.setItem("token", response.data.token);
      setUser(authenticatedUser);
      setToken(response.data.token);
      navigate("/app");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        displayName: data.displayName,
        dateOfBirth: data.dateOfBirth,
      });

      const authenticatedUser: User = {
        id: String(response.data.user.id),
        email: response.data.user.email,
        username: response.data.user.username,
        displayName:
          response.data.user.displayName || response.data.user.username,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${response.data.user.username}`,
      };

      localStorage.setItem("user", JSON.stringify(authenticatedUser));
      localStorage.setItem("token", response.data.token);
      setUser(authenticatedUser);
      setToken(response.data.token);
      navigate("/app");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await logoutUser(token);
      } catch (_error) {
        // Continue local logout even if server-side token revocation fails.
      }
    }

    clearSession();
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        isLoading,
      }}
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
