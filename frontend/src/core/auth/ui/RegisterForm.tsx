"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Lock, Loader2, Users, Briefcase, UserCheck } from "lucide-react";
import { isValidPhoneNumber } from "libphonenumber-js";
import { Button } from "@/shared/ui/ui/button";
import { toast } from "sonner";

type RoleType = "user" | "affiliate" | "business";

interface RegisterFormProps {
  onToggleForm: (e: React.MouseEvent) => void;
  onSuccess: () => void;
}

const roles: { key: RoleType; label: string; icon: React.ReactNode }[] = [
  { key: "user", label: "User", icon: <User className="w-4 h-4" /> },
  { key: "affiliate", label: "Affiliate", icon: <UserCheck className="w-4 h-4" /> },
  { key: "business", label: "Business", icon: <Briefcase className="w-4 h-4" /> },
];

export function RegisterForm({ onToggleForm, onSuccess }: RegisterFormProps) {
  // Basic Details
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [contactType, setContactType] = useState<"none" | "email" | "phone">("none");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("user");

  // Progressive States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  
  // OTP States
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(180);

  // UI States
  const [isLoading, setIsLoading] = useState(false);

  // Timer Effect
  useEffect(() => {
    if (isOtpSent && !isOtpVerified && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, isOtpSent, isOtpVerified]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = (pw: string) => {
    return pw.length >= 8 && /[A-Z]/.test(pw) && /\d/.test(pw) && /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(pw);
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContact(val);
    if (val.includes("@")) setContactType("email");
    else if (val.startsWith("+") || /\d/.test(val)) setContactType("phone");
    else setContactType("none");
  };

  const handleSendOtp = async () => {
    if (!fullName.trim()) return toast.error("Please enter your Full Name first.");
    if (contactType === "email" && !isEmailValid(contact)) return toast.error("Invalid email address.");
    if (contactType === "phone") {
      try {
        if (!isValidPhoneNumber(contact)) return toast.error("Invalid phone format (e.g. +92).");
      } catch (err) {
        return toast.error("Invalid phone format.");
      }
    }
    if (contactType === "none" || !contact.trim()) return toast.error("Enter Email or Phone.");

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsOtpSent(true);
      setTimeLeft(180);
      toast.success("Verification code sent.");
    }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== "" && index < 5) inputRefs.current[index + 1]?.focus();
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
    if (code.length < 6) return toast.error("Enter the full 6-digit code.");
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      
      let correctOtp = "123456";
      if (selectedRole === "business") correctOtp = "234567";
      if (selectedRole === "affiliate") correctOtp = "345678";

      if (code === correctOtp) {
        setIsOtpVerified(true);
        toast.success("OTP verified successfully!");
      } else {
        toast.error("Invalid OTP.");
      }
    }, 1000);
  };

  const handleCreateAccount = async () => {
    if (!agreed) return toast.error("You must agree to the Terms.");
    if (!isPasswordValid(password)) return toast.error("Password does not meet requirements.");
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          contact,
          password,
          role: selectedRole
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to create account');
      
      toast.success("Account created successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-8 py-6 rounded-2xl bg-white border border-slate-200 shadow-lg">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
        {roles.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSelectedRole(key);
              setFullName("");
              setContact("");
              setContactType("none");
              setPassword("");
              setAgreed(false);
              setIsOtpSent(false);
              setIsOtpVerified(false);
              setOtp(["", "", "", "", "", ""]);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
              selectedRole === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              disabled={isOtpVerified}
              placeholder="John Doe"
              className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-400 outline-none disabled:bg-slate-50"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isOtpSent) handleSendOtp(); }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email or Phone</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              disabled={isOtpSent}
              placeholder="you@example.com or +923001234567"
              className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-400 outline-none disabled:bg-slate-50"
              value={contact}
              onChange={handleContactChange}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isOtpSent) handleSendOtp(); }}
            />
          </div>
          {!isOtpSent && (
            <Button
              type="button"
              onClick={handleSendOtp}
              disabled={isLoading || !contact || !fullName}
              className="w-full h-10 mt-2 bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Send Verification Code"}
            </Button>
          )}
        </div>

        {isOtpSent && !isOtpVerified && (
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <label className="block text-sm font-medium text-slate-700 text-center mb-3">
              Enter code sent to {contact}
            </label>
            <div className="flex justify-center gap-2 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-10 h-12 text-center text-lg font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ))}
            </div>
            <Button onClick={handleVerifyOtp} disabled={isLoading || otp.join("").length < 6} className="w-full h-10 mb-2">
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify Code"}
            </Button>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">{timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "Expired"}</span>
              <button type="button" onClick={handleSendOtp} disabled={timeLeft > 0 || isLoading} className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">Resend</button>
            </div>
          </div>
        )}

        {isOtpVerified && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-sm font-medium">
              <UserCheck className="w-4 h-4" /> Verified
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Create Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full h-10 pl-9 pr-4 bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 outline-none"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAccount(); }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-x-2">
                <span className={password.length >= 8 ? "text-emerald-600" : ""}>• 8+ chars</span>
                <span className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>• 1 uppercase</span>
                <span className={/\d/.test(password) ? "text-emerald-600" : ""}>• 1 number</span>
                <span className={/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password) ? "text-emerald-600" : ""}>• 1 special</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span className="text-xs text-slate-600 leading-relaxed">
                I accept the <a href="#" className="text-blue-600 hover:underline">Terms</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
              </span>
            </label>

            <Button onClick={handleCreateAccount} disabled={isLoading || !agreed || !isPasswordValid(password)} className="w-full h-11">
              {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : `Create ${roles.find(r => r.key === selectedRole)?.label} Account`}
            </Button>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account? <button type="button" onClick={onToggleForm} className="text-blue-600 hover:text-blue-700 font-semibold">Sign in</button>
      </p>
    </div>
  );
}
