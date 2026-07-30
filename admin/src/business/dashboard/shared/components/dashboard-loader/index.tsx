"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppSelector } from "@/src/core/store/hooks";

interface AdminDashboardLoaderProps {
  children: React.ReactNode;
}

const steps = [
  { label: "Authenticating session", duration: 600 },
  { label: "Loading user accounts", duration: 800 },
  { label: "Fetching KYC queue", duration: 600 },
  { label: "Preparing dashboard", duration: 400 },
];

/**
 * Wraps the admin dashboard content with a premium loading screen.
 * Shows on first mount after login. Once data is ready (or max timeout),
 * fades out to reveal the dashboard content beneath.
 */
export function AdminDashboardLoader({ children }: AdminDashboardLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const token = useAppSelector((state) => state.auth.token);

  const finishLoading = useCallback(() => {
    // Fade out the loader
    setOpacity(0);
    setTimeout(() => setIsLoading(false), 600);
  }, []);

  useEffect(() => {
    if (!token) return;

    let totalTime = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step through loading stages
    steps.forEach((step, i) => {
      const t = setTimeout(() => {
        setStepIndex(i);
        setProgress(Math.round(((i + 1) / steps.length) * 85));
      }, totalTime);
      timers.push(t);
      totalTime += step.duration;
    });

    // Fetch critical admin data in parallel
    const fetchData = async () => {
      try {
        await Promise.all([
          fetch("/admin/api/sso/auth/admin/users?limit=20", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/admin/api/sso/auth/admin/stats", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
      } catch {
        // Silent fail — dashboard will handle its own error states
      }
      setProgress(100);
      setTimeout(finishLoading, 300);
    };

    // Start data fetch after a brief intro pause
    const fetchTimer = setTimeout(fetchData, 400);
    timers.push(fetchTimer);

    // Hard cap: never show loader for more than 5 seconds
    const maxTimer = setTimeout(() => {
      setProgress(100);
      finishLoading();
    }, 5000);
    timers.push(maxTimer);

    return () => timers.forEach(clearTimeout);
  }, [token, finishLoading]);

  if (!isLoading) return <>{children}</>;

  return (
    <>
      {/* Dashboard is rendered underneath but invisible during loading */}
      <div style={{ visibility: "hidden", position: "absolute", inset: 0 }}>
        {children}
      </div>

      {/* Overlay loader */}
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white dark:bg-slate-950"
        style={{ opacity, transition: "opacity 0.6s ease-in-out" }}
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
              animation: "pulse 3s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
              animation: "pulse 3s ease-in-out infinite 1.5s",
            }}
          />
        </div>

        {/* Logo / Brand */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 19H21" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your workspace...</p>
        </div>

        {/* Progress bar */}
        <div className="w-64 mb-6">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{
                width: `${progress}%`,
                transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {steps[Math.min(stepIndex, steps.length - 1)].label}...
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{progress}%</span>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === stepIndex ? "20px" : "6px",
                height: "6px",
                background: i <= stepIndex ? "#2563eb" : "#e2e8f0",
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.08; }
            50% { transform: scale(1.15); opacity: 0.15; }
          }
        `}</style>
      </div>
    </>
  );
}
