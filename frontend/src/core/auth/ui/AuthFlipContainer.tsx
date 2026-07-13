"use client";

import React, { useState } from "react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { OtpForm } from "./OtpForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

type AuthView = "login" | "register" | "otp_login" | "otp_register" | "forgot_password";

export function AuthFlipContainer() {
  const [currentView, setCurrentView] = useState<AuthView>("login");
  const [frontView, setFrontView] = useState<AuthView>("login");
  const [backView, setBackView] = useState<AuthView>("register");

  const handleNavigate = (view: AuthView) => {
    setCurrentView(view);
    if (view === "login" || view === "forgot_password" || view === "otp_login") {
      setFrontView(view);
    } else {
      setBackView(view);
    }
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
          minHeight: "640px", 
        }}
      >
        {/* Front Side: Login, Forgot Password, OTP (from login) */}
        <div
          className="w-full h-full absolute top-0 left-0 backface-hidden flex flex-col justify-center"
          style={{ backfaceVisibility: "hidden" }}
        >
          {frontView === "login" && (
            <LoginForm 
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
              onToggleForm={() => handleNavigate("login")} 
              onSuccess={() => handleNavigate("login")} 
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
