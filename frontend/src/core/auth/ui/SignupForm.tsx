"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isValidPhoneNumber, parsePhoneNumber } from "libphonenumber-js";

interface SignupFormProps {
  onToggleForm?: (e: React.MouseEvent) => void;
}

export function SignupForm({ onToggleForm }: SignupFormProps) {
  const router = useRouter();

  // Basic Details
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [contactType, setContactType] = useState<"none" | "email" | "phone">("none");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Progressive States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  
  // OTP States
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Timer Effect
  useEffect(() => {
    if (isOtpSent && !isOtpVerified && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, isOtpSent, isOtpVerified]);

  // Format Time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Validators
  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = (pw: string) => {
    const hasLength = pw.length >= 8;
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSpecial = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(pw);
    return hasLength && hasUpper && hasNumber && hasSpecial;
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContact(val);
    setError("");

    if (val.includes("@")) {
      setContactType("email");
    } else if (val.startsWith("+") || /\d/.test(val)) {
      setContactType("phone");
    } else {
      setContactType("none");
    }
  };

  const handleSendOtp = async () => {
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your Full Name first.");
      return;
    }

    if (contactType === "email" && !isEmailValid(contact)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (contactType === "phone") {
      try {
        if (!isValidPhoneNumber(contact)) {
          setError("Invalid phone number. Ensure you use the country code (e.g. +92).");
          return;
        }
      } catch (err) {
        setError("Invalid phone format. Please start with a + country code.");
        return;
      }
    }

    if (contactType === "none" || !contact.trim()) {
      setError("Please enter a valid Email or Phone Number.");
      return;
    }

    setIsLoading(true);
    // Simulate API Call to Send OTP
    setTimeout(() => {
      setIsLoading(false);
      setIsOtpSent(true);
      setTimeLeft(180); // Reset timer to 3 mins
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple chars
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance focus
    if (value !== "" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleVerifyOtp();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate API Call to Verify OTP
    setTimeout(() => {
      setIsLoading(false);
      if (code === "123456") {
        setIsOtpVerified(true);
      } else {
        setError("Invalid OTP code. For testing, use 123456.");
      }
    }, 1000);
  };

  const handleCreateAccount = async () => {
    if (!agreed) {
      setError("You must agree to the Terms and Conditions.");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password does not meet the security requirements.");
      return;
    }

    setIsLoading(true);
    setError("");

    // Simulate Final API Call to Create Account
    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-[2rem] bg-white backdrop-blur-xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Create Account</h2>
          <p className="text-slate-600 text-sm">Join the platform to access services and tools.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-600 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* 1. Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 ml-1">Full Name</label>
            <div className="relative group">
              <input
                type="text"
                disabled={isOtpVerified}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-slate-900 placeholder-slate-400 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isOtpSent) handleSendOtp(); }}
              />
            </div>
          </div>

          {/* 2. Email or Phone */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700 ml-1">Email or Phone Number</label>
            <div className="relative group">
              <input
                type="text"
                disabled={isOtpSent}
                placeholder="you@example.com or +923001234567"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-slate-900 placeholder-slate-400 transition-all outline-none disabled:bg-slate-50 disabled:text-slate-500"
                value={contact}
                onChange={handleContactChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isOtpSent) handleSendOtp(); }}
              />
            </div>
            {!isOtpSent && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading || !contact || !fullName}
                className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </button>
            )}
          </div>

          {/* 3. OTP Verification Section */}
          {isOtpSent && !isOtpVerified && (
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-medium text-slate-700 text-center mb-3">
                Enter the 6-digit code sent to {contact}
              </label>
              <div className="flex justify-center gap-2 sm:gap-3 mb-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 text-center text-xl font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-slate-900 outline-none transition-all"
                  />
                ))}
              </div>
              
              <button
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.join("").length < 6}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm mb-3"
              >
                Verify Code
              </button>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {timeLeft > 0 ? `Code expires in ${formatTime(timeLeft)}` : "Code expired"}
                </span>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={timeLeft > 0 || isLoading}
                  className="font-medium text-purple-600 hover:text-purple-700 disabled:opacity-40 disabled:hover:text-purple-600 transition-colors"
                >
                  Resend Code
                </button>
              </div>
            </div>
          )}

          {/* 4. Password Creation Section (Only visible after OTP verified) */}
          {isOtpVerified && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {contactType === 'email' ? 'Email' : 'Phone'} Verified Successfully
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 ml-1">Create a Secure Password</label>
                <div className="relative group">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 text-slate-900 placeholder-slate-400 transition-all outline-none"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAccount(); }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 ml-1 mt-1 space-y-0.5">
                  <p className={password.length >= 8 ? "text-emerald-600" : ""}>• Minimum 8 characters</p>
                  <p className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>• At least 1 uppercase letter</p>
                  <p className={/\d/.test(password) ? "text-emerald-600" : ""}>• At least 1 number</p>
                  <p className={/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password) ? "text-emerald-600" : ""}>• At least 1 special character</p>
                </div>
              </div>

              <label className="flex items-start gap-3 p-1 cursor-pointer group">
                <div className="relative flex items-center pt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border-2 border-slate-300 peer-checked:border-purple-600 peer-checked:bg-purple-600 transition-all flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the <a href="#" className="text-purple-600 hover:underline">Terms of Service</a> and <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>.
                </span>
              </label>

              <button
                onClick={handleCreateAccount}
                disabled={isLoading || !agreed || !isPasswordValid(password)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex justify-center items-center"
              >
                {isLoading ? "Processing..." : "Verify & Create Account"}
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have an account? <button type="button" onClick={onToggleForm} className="text-purple-600 hover:text-purple-500 font-medium transition-colors">Log in</button>
        </p>
      </div>
    </div>
  );
}
