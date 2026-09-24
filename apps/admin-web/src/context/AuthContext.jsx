"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem("admin_auth_token");
      localStorage.removeItem("admin_user_data");
      localStorage.removeItem("adminToken");
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const validateSession = useCallback(async (tokenToValidate) => {
    let savedToken = tokenToValidate;
    if (!savedToken && typeof window !== "undefined") {
      savedToken = localStorage.getItem("admin_auth_token") || localStorage.getItem("adminToken");
    }

    if (!savedToken || typeof savedToken !== "string" || savedToken.trim().length === 0) {
      clearSession();
      setIsInitializing(false);
      return false;
    }

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

      // 1. Try dedicated admin validation endpoint first
      let response = await fetch(`${API_BASE}/auth/validate-admin`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${savedToken}`,
          "Content-Type": "application/json"
        }
      });

      // 2. Fall back to /users/me if /auth/validate-admin is not yet available
      if (response.status === 404) {
        response = await fetch(`${API_BASE}/users/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${savedToken}`,
            "Content-Type": "application/json"
          }
        });
      }

      if (!response.ok) {
        throw new Error(`Token verification failed with status: ${response.status}`);
      }

      const resData = await response.json();
      const verifiedUser = resData.data;

      // 3. Strictly enforce active admin privileges
      if (!verifiedUser || verifiedUser.role !== "admin" || verifiedUser.isActive === false) {
        throw new Error("Access denied: User does not possess active administrator credentials");
      }

      // 4. Session is valid - persist fresh admin data
      localStorage.setItem("admin_auth_token", savedToken);
      localStorage.setItem("adminToken", savedToken);
      localStorage.setItem("admin_user_data", JSON.stringify(verifiedUser));

      setUser(verifiedUser);
      setToken(savedToken);
      setIsAuthenticated(true);
      setIsInitializing(false);
      return true;
    } catch (err) {
      console.warn("Session validation failed:", err.message);
      clearSession();
      setIsInitializing(false);
      return false;
    }
  }, [clearSession]);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const login = (userData, tokenStr) => {
    if (!userData || userData.role !== "admin") {
      throw new Error("Access denied. Only administrators are allowed to sign in.");
    }
    localStorage.setItem("admin_auth_token", tokenStr);
    localStorage.setItem("adminToken", tokenStr);
    localStorage.setItem("admin_user_data", JSON.stringify(userData));
    setUser(userData);
    setToken(tokenStr);
    setIsAuthenticated(true);
    router.replace("/");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, isInitializing, login, logout, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
