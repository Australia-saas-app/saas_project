"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { MessageSquare, Mail, Trash2, CheckCheck, User } from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import {
  getThreadsForRole,
  markThreadRead,
  archiveThread,
  type DashboardRole,
  type MessageThread,
} from "@/src/shared/lib/messages-store";
import { fetchUserThreads } from "@/src/modules/technical/services/technical.services";

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document !== "undefined") {
        setIsDark(document.documentElement.classList.contains("dark"));
      }
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "M";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec >= 0 && diffSec < 60) return "Just now";
  if (diffSec >= 60 && diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;

  const isSameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isSameDay) return timeStr;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isYesterday) return `Yesterday, ${timeStr}`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type MessagesBellProps = {
  viewAllHref?: string;
  emptyLabel?: string;
};

export function MessagesBell({
  viewAllHref,
  emptyLabel = "No new messages",
}: MessagesBellProps) {
  const [open, setOpen] = useState(false);
  const isDark = useIsDarkMode();
  const { user } = useUser();
  const rootRef = useRef<HTMLDivElement>(null);

  const currentUserEmail = user?.email ? String(user.email).trim().toLowerCase() : "";
  const userRole: DashboardRole =
    user && "role" in user && String(user.role).toLowerCase().includes("business")
      ? "business"
      : "user";

  const defaultHref =
    viewAllHref || (userRole === "business" ? "/dashboard/business/messages" : "/dashboard/user/messages");

  const [threads, setThreads] = useState<MessageThread[]>([]);

  const loadThreads = () => {
    const data = getThreadsForRole(userRole, currentUserEmail);
    setThreads(data.filter((t) => t.folder !== "deleted"));
  };

  useEffect(() => {
    loadThreads();
  }, [userRole, currentUserEmail]);

  // Sync on realtime broadcast events
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (event) => {
          if (
            event.data?.type === "vero:new_message" ||
            event.data?.type === "platform_new_email" ||
            event.data?.type === "vero:new_notification"
          ) {
            loadThreads();
          }
        };
      }
    } catch {}

    const handleStorage = () => loadThreads();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("messages_updated", handleStorage);
    window.addEventListener("platform_new_email", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("messages_updated", handleStorage);
      window.removeEventListener("platform_new_email", handleStorage);
      if (bc) bc.close();
    };
  }, [userRole, currentUserEmail]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const activeThreads = useMemo(() => {
    return threads.filter((t) => t.folder !== "deleted");
  }, [threads]);

  const unreadCount = useMemo(() => {
    return activeThreads.filter((t) => t.unread).length;
  }, [activeThreads]);

  const handleMarkAllRead = () => {
    activeThreads.forEach((t) => markThreadRead(t.id));
    loadThreads();
  };

  const handleDeleteAll = () => {
    activeThreads.forEach((t) => archiveThread(t.id, currentUserEmail));
    loadThreads();
  };

  const handleDeleteSingle = (id: string) => {
    archiveThread(id, currentUserEmail);
    loadThreads();
  };

  return (
    <div ref={rootRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : "Messages"}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Messages"
      >
        <Mail className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            zIndex: 999999,
            backgroundColor: isDark ? "#0f172a" : "#ffffff",
            borderColor: isDark ? "#1e293b" : "#e2e8f0",
            color: isDark ? "#f8fafc" : "#0f172a",
          }}
          className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md"
          role="menu"
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.98)" : "#f8fafc",
              borderBottom: isDark ? "1px solid #1e293b" : "1px solid #f1f5f9",
            }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p
                style={{ color: isDark ? "#ffffff" : "#0f172a", fontWeight: 700 }}
                className="text-sm flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4 text-blue-500" /> Messages
              </p>
              <p
                style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                className="text-xs"
              >
                {unreadCount > 0 ? `${unreadCount} unread conversation${unreadCount === 1 ? "" : "s"}` : emptyLabel}
              </p>
            </div>
            {activeThreads.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                style={{ color: "#ef4444" }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-rose-500/10 cursor-pointer transition-colors"
              >
                Delete all
              </button>
            )}
          </div>

          {/* List */}
          <ul
            style={{ backgroundColor: isDark ? "#0f172a" : "#ffffff" }}
            className="max-h-80 overflow-y-auto divide-y divide-border"
          >
            {activeThreads.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                    color: isDark ? "#94a3b8" : "#64748b",
                  }}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <Mail className="h-6 w-6 opacity-50" />
                </div>
                <p
                  style={{ color: isDark ? "#ffffff" : "#0f172a" }}
                  className="text-sm font-medium"
                >
                  No messages yet
                </p>
                <p
                  style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                  className="mt-1 text-xs"
                >
                  {emptyLabel}
                </p>
              </li>
            ) : (
              activeThreads.map((t) => {
                const isSenderMe = userRole === "user";
                const displayName = isSenderMe
                  ? t.recipientName || t.participant || "Business Partner"
                  : t.senderName || t.participant || "Client";
                const secondaryTag = isSenderMe
                  ? t.recipientBusiness || ""
                  : "Client";

                const latestMsg =
                  t.messages && t.messages.length > 0
                    ? t.messages[t.messages.length - 1]?.body
                    : t.draftBody || t.subject || "No content";

                const targetLink = `${defaultHref}?thread=${t.id}`;

                return (
                  <li key={t.id} className="relative group">
                    <Link
                      href={targetLink}
                      onClick={() => {
                        markThreadRead(t.id);
                        setOpen(false);
                      }}
                      style={{
                        backgroundColor: t.unread
                          ? isDark
                            ? "rgba(255, 255, 255, 0.05)"
                            : "#f0f9ff"
                          : "transparent",
                        borderLeft: t.unread
                          ? isDark
                            ? "3px solid #3b82f6"
                            : "3px solid #2563eb"
                          : "3px solid transparent",
                      }}
                      className="block px-4 py-3 pr-10 transition-colors hover:opacity-90 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs border border-blue-500/20 mt-0.5">
                          {getInitials(displayName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p
                              style={{
                                color: t.unread
                                  ? isDark
                                    ? "#ffffff"
                                    : "#0f172a"
                                  : isDark
                                  ? "#cbd5e1"
                                  : "#475569",
                                fontWeight: t.unread ? 700 : 600,
                              }}
                              className="truncate text-xs"
                            >
                              {displayName}
                              {secondaryTag && (
                                <span className="text-muted-foreground font-normal ml-1">
                                  | {secondaryTag}
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                              {formatMessageTime(t.updatedAt)}
                            </span>
                          </div>
                          <p
                            style={{
                              color: t.unread
                                ? isDark
                                  ? "#e2e8f0"
                                  : "#334155"
                                : isDark
                                ? "#94a3b8"
                                : "#64748b",
                            }}
                            className="mt-0.5 line-clamp-1 text-xs leading-relaxed"
                          >
                            {latestMsg}
                          </p>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteSingle(t.id);
                      }}
                      style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-500 cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer */}
          <div
            style={{
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.98)" : "#f8fafc",
              borderTop: isDark ? "1px solid #1e293b" : "1px solid #f1f5f9",
            }}
            className="px-4 py-2.5 flex items-center justify-between"
          >
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleMarkAllRead();
                }}
                style={{ color: isDark ? "#60a5fa" : "#2563eb" }}
                className="text-xs font-bold hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            ) : <span />}
            <Link
              href={defaultHref}
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
