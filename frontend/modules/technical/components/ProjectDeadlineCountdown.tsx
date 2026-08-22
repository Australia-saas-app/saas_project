"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface ProjectDeadlineCountdownProps {
  endDate?: string | Date;
  createdAt?: string | Date;
  assignedAt?: string | Date;
  className?: string;
}

export function ProjectDeadlineCountdown({
  endDate,
  createdAt,
  assignedAt,
  className = "",
}: ProjectDeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    let target = 0;
    if (endDate) {
      const parsed = new Date(endDate).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        target = parsed;
      }
    }

    if (!target) {
      // Fallback: 7 days after assignedAt or createdAt
      const base = assignedAt
        ? new Date(assignedAt).getTime()
        : createdAt
        ? new Date(createdAt).getTime()
        : Date.now();
      target = base + 7 * 24 * 60 * 60 * 1000;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalMs: 0,
          isExpired: true,
        });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: diff,
        isExpired: false,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate, createdAt, assignedAt]);

  if (!timeLeft) return null;

  // Red pill when 24 hours (23H 59M 59S) or less remain, or expired
  const isUrgent = timeLeft.totalMs <= 24 * 60 * 60 * 1000 || timeLeft.isExpired;

  const pad = (n: number) => String(n).padStart(2, "0");

  const formatted = timeLeft.isExpired
    ? "00D 00H 00M 00S"
    : `${timeLeft.days}D ${pad(timeLeft.hours)}H ${pad(timeLeft.minutes)}M ${pad(
        timeLeft.seconds
      )}S`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-mono font-extrabold uppercase tracking-wide border transition-all select-none ${
        isUrgent
          ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse"
          : "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300 dark:bg-purple-950/50"
      } ${className}`}
      title={
        timeLeft.isExpired
          ? "Project Deadline Passed"
          : isUrgent
          ? "Urgent: Less than 24 hours remaining"
          : "Time Remaining to Project Deadline"
      }
    >
      <Clock
        className={`h-3 w-3 ${
          isUrgent
            ? "text-rose-600 dark:text-rose-400"
            : "text-purple-600 dark:text-purple-400"
        }`}
      />
      <span>{formatted}</span>
    </span>
  );
}
