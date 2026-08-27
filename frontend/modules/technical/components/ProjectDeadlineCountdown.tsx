"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { readLocalProjects } from "../services/technical.services";

interface ProjectDeadlineCountdownProps {
  projectId?: string;
  endDate?: string | Date;
  createdAt?: string | Date;
  assignedAt?: string | Date;
  completedAt?: string | Date;
  isCompleted?: boolean;
  status?: string;
  className?: string;
}

export function ProjectDeadlineCountdown({
  projectId,
  endDate,
  createdAt,
  assignedAt,
  completedAt,
  isCompleted = false,
  status,
  className = "",
}: ProjectDeadlineCountdownProps) {
  const [effectiveEndDate, setEffectiveEndDate] = useState<string | Date | undefined>(endDate);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
    isExpired: boolean;
    isFinished?: boolean;
    finishedBefore?: boolean;
  } | null>(null);

  useEffect(() => {
    setEffectiveEndDate(endDate);
  }, [endDate]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (projectId && e.detail?.projectId === projectId && e.detail?.endDate) {
        setEffectiveEndDate(e.detail.endDate);
      }
    };
    window.addEventListener("project_deadline_updated", handleUpdate);
    return () => window.removeEventListener("project_deadline_updated", handleUpdate);
  }, [projectId]);

  const localProject =
    typeof window !== "undefined" && projectId
      ? readLocalProjects().find(
          (lp: any) =>
            lp.projectId === projectId ||
            String(lp.id) === String(projectId) ||
            `PRJ-${lp.id}` === projectId ||
            lp.projectId === `PRJ-${projectId}`
        )
      : null;

  const isProjectDone =
    isCompleted ||
    status === "completed" ||
    status === "accepted" ||
    localProject?.submissionStatus === "completed" ||
    localProject?.submissionStatus === "accepted" ||
    localProject?.status === "completed" ||
    localProject?.status === "accepted" ||
    (() => {
      const ms = (localProject as any)?.milestones;
      const terms = ((localProject as any)?.paymentTerms || "").toLowerCase();
      const mCount = terms.includes("three") || terms === "3" ? 3 : terms.includes("two") || terms === "2" ? 2 : 1;
      return Array.isArray(ms) && ms.length >= mCount && mCount > 0 && ms.slice(0, mCount).every((m: any) => m?.status === "accepted");
    })();

  useEffect(() => {
    let target = 0;
    const finalEnd = effectiveEndDate || localProject?.endDate;
    if (finalEnd) {
      const parsed = new Date(finalEnd).getTime();
      if (!isNaN(parsed) && parsed > 0) {
        target = parsed;
      }
    }

    if (!target) {
      // Fallback: 7 days after assignedAt or createdAt
      const base = assignedAt || localProject?.assignedAt
        ? new Date(assignedAt || localProject?.assignedAt).getTime()
        : createdAt || localProject?.createdAt
        ? new Date(createdAt || localProject?.createdAt).getTime()
        : Date.now();
      target = base + 7 * 24 * 60 * 60 * 1000;
    }

    // 1. If project is finished/completed: Freeze the recorded time!
    if (isProjectDone) {
      let finishTimestamp = 0;
      const compDate =
        completedAt ||
        (localProject as any)?.completedAt ||
        (localProject as any)?.acceptedAt ||
        (localProject as any)?.updatedAt;

      if (compDate) {
        const cParsed = new Date(compDate).getTime();
        if (!isNaN(cParsed) && cParsed > 0) {
          finishTimestamp = cParsed;
        }
      }

      if (!finishTimestamp && typeof window !== "undefined" && projectId) {
        const cleanId = projectId.replace(/^PRJ-/i, "");
        const cached =
          localStorage.getItem(`project_completed_at_${projectId}`) ||
          localStorage.getItem(`project_completed_at_${cleanId}`) ||
          localStorage.getItem(`project_completed_at_PRJ-${cleanId}`);
        if (cached) {
          const cachedTime = Number(cached);
          if (!isNaN(cachedTime) && cachedTime > 0) {
            finishTimestamp = cachedTime;
          }
        }
      }

      if (!finishTimestamp) {
        finishTimestamp = Date.now();
        if (typeof window !== "undefined" && projectId) {
          try {
            localStorage.setItem(`project_completed_at_${projectId}`, String(finishTimestamp));
          } catch {}
        }
      }

      const diff = target - finishTimestamp;
      const finishedBefore = diff >= 0;
      const absDiff = Math.abs(diff);

      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((absDiff / (1000 * 60)) % 60);
      const seconds = Math.floor((absDiff / 1000) % 60);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalMs: absDiff,
        isExpired: !finishedBefore,
        isFinished: true,
        finishedBefore,
      });
      return;
    }

    // 2. Active / In-progress: Real-time ticking countdown to deadline
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
          isFinished: false,
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
        isFinished: false,
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [effectiveEndDate, createdAt, assignedAt, completedAt, isProjectDone, projectId]);

  if (!timeLeft) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  // A. Completed Project: Frozen time pill
  if (timeLeft.isFinished) {
    const formatted = `${timeLeft.finishedBefore ? "Before" : "After"} ${timeLeft.days}D ${pad(
      timeLeft.hours
    )}H ${pad(timeLeft.minutes)}M ${pad(timeLeft.seconds)}S`;

    if (timeLeft.finishedBefore) {
      // Completed Under Deadline: Green Pill
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-mono font-extrabold uppercase tracking-wide border transition-all select-none bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 ${className}`}
          title={`Completed before deadline by ${timeLeft.days}D ${timeLeft.hours}H ${timeLeft.minutes}M ${timeLeft.seconds}S`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
          <span>{formatted}</span>
        </span>
      );
    } else {
      // Completed After Deadline: Red Pill
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-mono font-extrabold uppercase tracking-wide border transition-all select-none bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 ${className}`}
          title={`Completed after deadline by ${timeLeft.days}D ${timeLeft.hours}H ${timeLeft.minutes}M ${timeLeft.seconds}S`}
        >
          <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
          <span>{formatted}</span>
        </span>
      );
    }
  }

  // B. Active / In-progress: Countdown Pill
  const isUrgent = timeLeft.totalMs <= 24 * 60 * 60 * 1000 || timeLeft.isExpired;

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
