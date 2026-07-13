"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "customer" | "rider" | "agency";

interface RegistrationData {
  fullName: string;
  contact: string; // Email or Phone
  password: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: {
    name: string;
    email: string;
    roles: UserRole[];
  } | null;
  login: (userData: any, token: string) => Promise<void>;
  logout: () => void;
  register: (data: RegistrationData) => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  forgotPassword: (contact: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; roles: UserRole[] } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("mock_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const _performLogin = (email: string, name: string = "User") => {
    const newRoles: UserRole[] = ["customer"];
    if (email.toLowerCase().includes("rider")) newRoles.push("rider");
    if (email.toLowerCase().includes("agency")) newRoles.push("agency");

    const userData = { name, email, roles: newRoles };
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("mock_user", JSON.stringify(userData));
  };

  const login = async (userData: any, token: string) => {
    setUser({ name: userData.fullName || "User", email: userData.email || userData.phone, roles: [userData.role as UserRole] });
    setIsAuthenticated(true);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", token);
  };

  const register = async (data: RegistrationData) => {
    await delay(100);
    // In a real app, this sends an OTP. Here we just pretend it succeeded.
    localStorage.setItem("pending_registration", JSON.stringify(data));
  };

  const verifyOTP = async (code: string) => {
    await delay(600);
    if (code === "123456") {
      const pendingData = localStorage.getItem("pending_registration");
      if (pendingData) {
        const { fullName, contact } = JSON.parse(pendingData);
        _performLogin(contact, fullName);
        localStorage.removeItem("pending_registration");
      } else {
        // Fallback login
        _performLogin("verified@user.com", "Verified User");
      }
      return true;
    }
    return false;
  };

  const forgotPassword = async (contact: string) => {
    await delay(800);
    // Sends OTP to contact
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("mock_user");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, register, verifyOTP, forgotPassword }}>
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
