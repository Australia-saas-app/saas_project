"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { MessageSquare, Mail, Trash2, CheckCheck, User } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import {
  getThreadsForRole,
  getReadMessageIds,
  markMessagesAsRead,
  markThreadRead,
  archiveThread,
  syncMongoDBThreads,
  type DashboardRole,
  type MessageThread,
} from "@/src/shared/lib/messages-store";
import { fetchUserThreads, deleteUserThread } from "@/src/modules/technical/services/technical.services";

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
  className?: string;
  iconClassName?: string;
};

export function MessagesBell({
  viewAllHref,
  emptyLabel = "No new messages",
  className,
  iconClassName = "h-5 w-5",
}: MessagesBellProps) {
  const [open, setOpen] = useState(false);
  const isDark = useIsDarkMode();
  const { user } = useUser();
  const rootRef = useRef<HTMLDivElement>(null);

  const currentUserEmail = (
    user?.email ||
    (user as any)?.userEmail ||
    (user as any)?.contactEmail ||
    ""
  )
    .trim()
    .toLowerCase();

  const userRole: DashboardRole =
    user && "role" in user && /business|seller|partner/i.test(String(user.role))
      ? "business"
      : user && "role" in user && /affiliate/i.test(String(user.role))
      ? "affiliate"
      : "user";

  const defaultHref =
    viewAllHref ||
    (userRole === "business"
      ? "/dashboard/business/messages"
      : userRole === "affiliate"
      ? "/dashboard/affiliate/messages"
      : "/dashboard/user/messages");

  const [threads, setThreads] = useState<MessageThread[]>([]);

  const loadThreads = () => {
    const data = getThreadsForRole(userRole, currentUserEmail);
    setThreads(data.filter((t) => t.folder !== "deleted"));
  };

  useEffect(() => {
    let isMounted = true;
    const syncFromDB = async () => {
      try {
        const dbThreads = await fetchUserThreads();
        if (isMounted && Array.isArray(dbThreads) && dbThreads.length > 0) {
          syncMongoDBThreads(dbThreads, currentUserEmail);
          const data = getThreadsForRole(userRole, currentUserEmail);
          setThreads(data.filter((t) => t.folder !== "deleted"));
        }
      } catch {}
    };

    loadThreads();
    syncFromDB();

    const interval = setInterval(syncFromDB, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userRole, currentUserEmail]);

  // Sync on realtime broadcast events & show incoming toast anywhere on dashboard or landing page
  useEffect(() => {
    const handleIncomingEmail = (event: Event) => {
      loadThreads();
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      const normalizedRec = (detail.recipientEmail || "").trim().toLowerCase();
      const normalizedSender = (detail.senderEmail || "").trim().toLowerCase();
      const normalizedCurrent = (currentUserEmail || "").trim().toLowerCase();

      const isSenderMe = normalizedCurrent && normalizedSender === normalizedCurrent;
      const isRecipient =
        (normalizedCurrent && normalizedRec === normalizedCurrent) ||
        (!isSenderMe && normalizedRec && normalizedRec === normalizedCurrent);

      if (isRecipient && !isSenderMe) {
        const sender = detail.senderName || detail.senderEmail || "A user";
        toast("You have received a new message", {
          description: `From: ${sender} — "${(detail.body || detail.subject || "").slice(0, 70)}..."`,
          action: {
            label: "View message",
            onClick: () => {
              window.location.href = `${defaultHref}?thread=${detail.threadId}`;
            },
          },
          duration: 8000,
        });
      }
    };

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

            if (event.data?.type === "platform_new_email" && event.data.detail) {
              const detail = event.data.detail;
              const normalizedRec = (detail.recipientEmail || "").trim().toLowerCase();
              const normalizedSender = (detail.senderEmail || "").trim().toLowerCase();
              const normalizedCurrent = (currentUserEmail || "").trim().toLowerCase();

              const isSenderMe = normalizedCurrent && normalizedSender === normalizedCurrent;
              const isRecipient =
                (normalizedCurrent && normalizedRec === normalizedCurrent) ||
                (!isSenderMe && normalizedRec && normalizedRec === normalizedCurrent);

              if (isRecipient && !isSenderMe) {
                const sender = detail.senderName || detail.senderEmail || "A user";
                toast("You have received a new message", {
                  description: `From: ${sender} — "${(detail.body || detail.subject || "").slice(0, 70)}..."`,
                  action: {
                    label: "View message",
                    onClick: () => {
                      window.location.href = `${defaultHref}?thread=${detail.threadId}`;
                    },
                  },
                  duration: 8000,
                });
              }
            }
          }
        };
      }
    } catch {}

    const handleStorage = () => loadThreads();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("messages_updated", handleStorage);
    window.addEventListener("platform_new_email", handleIncomingEmail);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("messages_updated", handleStorage);
      window.removeEventListener("platform_new_email", handleIncomingEmail);
      if (bc) bc.close();
    };
  }, [userRole, currentUserEmail, defaultHref]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const readMsgIds = useMemo(() => {
    return getReadMessageIds(currentUserEmail);
  }, [currentUserEmail, threads]);

  const unreadThreads = useMemo(() => {
    return threads.filter((t) => t.folder !== "deleted" && t.unread && t.messages && t.messages.length > 0);
  }, [threads]);

  const unreadCount = useMemo(() => {
    return unreadThreads.length;
  }, [unreadThreads]);

  const handleMarkAllRead = () => {
    unreadThreads.forEach((t) => {
      markThreadRead(t.id, currentUserEmail);
      if (currentUserEmail) {
        markMessagesAsRead(t.messages.map((m) => m.id), currentUserEmail);
      }
    });
    loadThreads();
  };

  const handleDeleteAll = () => {
    unreadThreads.forEach((t) => {
      archiveThread(t.id, currentUserEmail);
      deleteUserThread(t.id);
    });
    loadThreads();
  };

  const handleDeleteSingle = (id: string) => {
    archiveThread(id, currentUserEmail);
    deleteUserThread(id);
    if (currentUserEmail) {
      const target = threads.find((t) => t.id === id);
      if (target) markMessagesAsRead(target.messages.map((m) => m.id), currentUserEmail);
    }
    loadThreads();
  };

  return (
    <div ref={rootRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          className ||
          "relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        }
        aria-label={unreadCount > 0 ? `${unreadCount} unread messages` : "Messages"}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Messages"
      >
        <MessageSquare className={iconClassName} />
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
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}` : emptyLabel}
              </p>
            </div>
            {unreadThreads.length > 0 && (
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
            {unreadThreads.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                    color: isDark ? "#94a3b8" : "#64748b",
                  }}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <MessageSquare className="h-6 w-6 opacity-50" />
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
              unreadThreads.map((t) => {
                const isSenderMe = userRole === "user";
                const displayName = isSenderMe
                  ? t.recipientName || t.participant || "Business Partner"
                  : t.senderName || t.participant || "Client";
                const secondaryTag = isSenderMe
                  ? t.recipientBusiness || ""
                  : "Client";

                const latestThemMsg =
                  t.messages && t.messages.length > 0
                    ? [...t.messages].reverse().find((m) => m.from === "them" || (m.fromEmail && m.fromEmail.toLowerCase() !== currentUserEmail))?.body || t.messages[t.messages.length - 1]?.body
                    : t.draftBody || t.subject || "New message";

                const targetLink = `${defaultHref}?thread=${t.id}`;

                return (
                  <li key={t.id} className="relative group">
                    <Link
                      href={targetLink}
                      onClick={() => {
                        markThreadRead(t.id, currentUserEmail);
                        if (currentUserEmail) {
                          markMessagesAsRead(t.messages.map((m) => m.id), currentUserEmail);
                        }
                        setOpen(false);
                      }}
                      style={{
                        backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f0f9ff",
                        borderLeft: isDark ? "3px solid #3b82f6" : "3px solid #2563eb",
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
                                color: isDark ? "#ffffff" : "#0f172a",
                                fontWeight: 700,
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
                              color: isDark ? "#e2e8f0" : "#334155",
                            }}
                            className="mt-0.5 line-clamp-1 text-xs leading-relaxed"
                          >
                            {latestThemMsg}
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
                      title="Dismiss notification"
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
