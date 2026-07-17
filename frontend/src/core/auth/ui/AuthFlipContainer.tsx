"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { OtpForm } from "./OtpForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { useAuth } from "@/core/auth/context/AuthContext";

type AuthView = "login" | "register" | "otp_login" | "otp_register" | "forgot_password";
type RoleType = "user" | "affiliate" | "business";

function AuthFlipContainerContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get("mode");
  const roleParam = searchParams?.get("role");
  const isRoleLocked = !!roleParam;
  const initialRole = (roleParam ?? "user") as RoleType;
  const isRegister = initialMode === "register";

  const [currentView, setCurrentView] = useState<AuthView>(isRegister ? "register" : "login");
  const [frontView, setFrontView] = useState<AuthView>("login");
  const [backView, setBackView] = useState<AuthView>("register");

  const [loginKey, setLoginKey] = useState<number>(Date.now());
  const [registerKey, setRegisterKey] = useState<number>(Date.now());

  const { isAuthenticated } = useAuth();

  const handleNavigate = (view: AuthView) => {
    setCurrentView(view);
    if (view === "login" || view === "forgot_password" || view === "otp_login") {
      setFrontView(view);
      setLoginKey(Date.now());
    } else {
      setBackView(view);
      setRegisterKey(Date.now());
    }
  };

  // Intercept register->login navigation when already authenticated
  const handleRegisterToLogin = () => {
    if (isAuthenticated) {
      toast.info("An account is already logged in!");
      return;
    }
    handleNavigate("login");
  };

  // It's flipped if we are on register or otp_register
  const isFlipped = currentView === "register" || currentView === "otp_register";

  return (
    <div className="relative w-full max-w-md perspective-1000" style={{ perspective: "1000px" }}>
      <div
        className="w-full relative transition-transform duration-700 transform-style-3d z-0"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "580px",
        }}
      >
        {/* Front Side: Login, Forgot Password, OTP (from login) */}
        <div
          className="w-full h-full absolute top-0 left-0 backface-hidden flex flex-col justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          {frontView === "login" && (
            <LoginForm
              key={loginKey}
              onToggleForm={() => handleNavigate("register")}
              onForgotPassword={() => handleNavigate("forgot_password")}
            />
          )}
          {frontView === "forgot_password" && (
            <ForgotPasswordForm
              onBack={() => handleNavigate("login")}
              onSuccess={() => handleNavigate("otp_login")}
            />
          )}
          {frontView === "otp_login" && (
            <OtpForm
              onBack={() => handleNavigate("login")}
            />
          )}
        </div>

        {/* Back Side: Register, OTP (from register) */}
        <div
          className="w-full h-full absolute top-0 left-0 backface-hidden flex flex-col justify-center"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {backView === "register" && (
            <RegisterForm
              key={registerKey}
              initialRole={initialRole}
              isRoleLocked={isRoleLocked}
              onToggleForm={handleRegisterToLogin}
              onSuccess={handleRegisterToLogin}
            />
          )}
          {backView === "otp_register" && (
            <OtpForm
              onBack={() => handleNavigate("register")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthFlipContainer() {
  return (
    <Suspense fallback={<div className="w-full min-h-[580px] flex items-center justify-center">Loading...</div>}>
      <AuthFlipContainerContent />
    </Suspense>
  );
}
