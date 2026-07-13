"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/auth/context/AuthContext";

interface OtpFormProps {
  onBack: () => void;
}

export function OtpForm({ onBack }: OtpFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const { verifyOTP } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setIsLoading(true);
    try {
      const success = await verifyOTP(code);
      if (success) {
        router.push("/home"); // Redirect on successful verification (which logs them in)
      } else {
        setError("Invalid OTP code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-[2rem] bg-white backdrop-blur-xl border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 mb-4 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Enter OTP</h2>
          <p className="text-slate-600 text-sm">We've sent a 6-digit code to your contact method.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1 text-center">
            <label className="text-xs font-medium text-slate-700">6-Digit Code</label>
            <div className="flex justify-center mt-2">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                className="w-32 text-center text-2xl tracking-widest py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-900 placeholder-slate-300 transition-all outline-none"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length < 6}
            className="w-full py-3 mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 flex justify-center items-center"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Verify Code"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600">
          Didn't receive it? <button type="button" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">Resend (mock)</button>
        </p>
      </div>
    </div>
  );
}
