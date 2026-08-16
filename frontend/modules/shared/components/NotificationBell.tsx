"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { type NotificationItem, formatNotificationTime } from "@/src/constants/notifications";
import { useNotifications } from "@/src/shared/context/notification.provider";

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

type NotificationBellProps = {
  viewAllHref: string;
  emptyLabel?: string;
};

export function NotificationBell({
  viewAllHref,
  emptyLabel = "You're all caught up",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const isDark = useIsDarkMode();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
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
                className="text-sm"
              >
                Notifications
              </p>
              <p
                style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                className="text-xs"
              >
                {unreadCount > 0 ? `${unreadCount} unread` : emptyLabel}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
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
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
                    color: isDark ? "#94a3b8" : "#64748b",
                  }}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p
                  style={{ color: isDark ? "#ffffff" : "#0f172a" }}
                  className="text-sm font-medium"
                >
                  No notifications yet
                </p>
                <p
                  style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                  className="mt-1 text-xs"
                >
                  {emptyLabel}
                </p>
              </li>
            ) : (
              notifications.map((item) => (
                <li key={item.id} className="relative group">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => {
                        markRead(item.id);
                        setOpen(false);
                      }}
                      style={{
                        backgroundColor: !item.read
                          ? isDark
                            ? "rgba(255, 255, 255, 0.05)"
                            : "#f0f9ff"
                          : "transparent",
                        borderLeft: !item.read
                          ? isDark
                            ? "3px solid #3b82f6"
                            : "3px solid #2563eb"
                          : "3px solid transparent",
                      }}
                      className="block px-4 py-3 pr-10 transition-colors hover:opacity-90"
                    >
                      <NotificationRow item={item} isDark={isDark} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      style={{
                        backgroundColor: !item.read
                          ? isDark
                            ? "rgba(255, 255, 255, 0.05)"
                            : "#f0f9ff"
                          : "transparent",
                        borderLeft: !item.read
                          ? isDark
                            ? "3px solid #3b82f6"
                            : "3px solid #2563eb"
                          : "3px solid transparent",
                      }}
                      className="block w-full px-4 py-3 pr-10 text-left transition-colors cursor-pointer hover:opacity-90"
                    >
                      <NotificationRow item={item} isDark={isDark} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    style={{ color: isDark ? "#94a3b8" : "#64748b" }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          {unreadCount > 0 && (
            <div
              style={{
                backgroundColor: isDark ? "rgba(15, 23, 42, 0.98)" : "#f8fafc",
                borderTop: isDark ? "1px solid #1e293b" : "1px solid #f1f5f9",
              }}
              className="px-4 py-2.5"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
                style={{ color: isDark ? "#60a5fa" : "#2563eb" }}
                className="block w-full text-center text-xs font-bold hover:underline cursor-pointer"
              >
                Read all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({ item, isDark }: { item: NotificationItem; isDark: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span
        style={{
          backgroundColor: !item.read
            ? isDark
              ? "#3b82f6"
              : "#2563eb"
            : isDark
            ? "#475569"
            : "#cbd5e1",
          boxShadow: !item.read
            ? isDark
              ? "0 0 0 3px rgba(59, 130, 246, 0.3)"
              : "0 0 0 3px rgba(37, 99, 235, 0.2)"
            : "none",
        }}
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p
          style={{
            color: !item.read
              ? isDark
                ? "#ffffff"
                : "#0f172a"
              : isDark
              ? "#cbd5e1"
              : "#475569",
            fontWeight: !item.read ? 700 : 600,
          }}
          className="truncate text-xs"
        >
          {item.title}
        </p>
        <p
          style={{
            color: !item.read
              ? isDark
                ? "#e2e8f0"
                : "#334155"
              : isDark
              ? "#94a3b8"
              : "#64748b",
          }}
          className="mt-0.5 line-clamp-2 text-xs leading-relaxed"
        >
          {item.message}
        </p>
        <p
          style={{
            color: isDark ? "#94a3b8" : "#64748b",
          }}
          className="mt-1 text-[10px] font-medium"
        >
          {formatNotificationTime(item.createdAt || item.time)}
        </p>
      </div>
    </div>
  );
}
