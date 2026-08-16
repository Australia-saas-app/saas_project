"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { type NotificationItem, formatNotificationTime } from "@/src/constants/notifications";
import { useNotifications } from "@/src/shared/context/notification.provider";

type NotificationBellProps = {
  viewAllHref: string;
  emptyLabel?: string;
};

export function NotificationBell({
  viewAllHref,
  emptyLabel = "You're all caught up",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
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
        className="relative rounded-xl p-2 text-foreground/80 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
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
            backgroundColor: "#0f172a",
            borderColor: "#1e293b",
            color: "#f8fafc",
          }}
          className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md"
          role="menu"
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.98)",
              borderBottom: "1px solid #1e293b",
            }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p style={{ color: "#ffffff", fontWeight: 700 }} className="text-sm">
                Notifications
              </p>
              <p style={{ color: "#94a3b8" }} className="text-xs">
                {unreadCount > 0 ? `${unreadCount} unread` : emptyLabel}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
                style={{ color: "#f43f5e" }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-rose-500/10 cursor-pointer transition-colors"
              >
                Delete all
              </button>
            )}
          </div>

          {/* List */}
          <ul
            style={{ backgroundColor: "#0f172a" }}
            className="max-h-80 overflow-y-auto divide-y divide-white/5"
          >
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div
                  style={{ backgroundColor: "rgba(255, 255, 255, 0.05)", color: "#94a3b8" }}
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p style={{ color: "#ffffff" }} className="text-sm font-medium">
                  No notifications yet
                </p>
                <p style={{ color: "#94a3b8" }} className="mt-1 text-xs">
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
                        backgroundColor: !item.read ? "rgba(255, 255, 255, 0.05)" : "transparent",
                        borderLeft: !item.read ? "3px solid #3b82f6" : "3px solid transparent",
                      }}
                      className="block px-4 py-3 pr-10 transition-colors hover:bg-white/[0.08]"
                    >
                      <NotificationRow item={item} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      style={{
                        backgroundColor: !item.read ? "rgba(255, 255, 255, 0.05)" : "transparent",
                        borderLeft: !item.read ? "3px solid #3b82f6" : "3px solid transparent",
                      }}
                      className="block w-full px-4 py-3 pr-10 text-left transition-colors cursor-pointer hover:bg-white/[0.08]"
                    >
                      <NotificationRow item={item} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteNotification(item.id);
                    }}
                    style={{ color: "#94a3b8" }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-400 hover:bg-white/10 cursor-pointer"
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
                backgroundColor: "rgba(15, 23, 42, 0.98)",
                borderTop: "1px solid #1e293b",
              }}
              className="px-4 py-2.5"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
                style={{ color: "#60a5fa" }}
                className="block w-full text-center text-xs font-bold hover:text-blue-300 hover:underline cursor-pointer"
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

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="flex items-start gap-3">
      <span
        style={{
          backgroundColor: !item.read ? "#3b82f6" : "#475569",
          boxShadow: !item.read ? "0 0 0 3px rgba(59, 130, 246, 0.3)" : "none",
        }}
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
      />
      <div className="min-w-0 flex-1">
        <p
          style={{
            color: !item.read ? "#ffffff" : "#cbd5e1",
            fontWeight: !item.read ? 700 : 600,
          }}
          className="truncate text-xs"
        >
          {item.title}
        </p>
        <p
          style={{
            color: !item.read ? "#f1f5f9" : "#94a3b8",
          }}
          className="mt-0.5 line-clamp-2 text-xs leading-relaxed"
        >
          {item.message}
        </p>
        <p
          style={{
            color: "#94a3b8",
          }}
          className="mt-1 text-[10px] font-medium"
        >
          {formatNotificationTime(item.createdAt || item.time)}
        </p>
      </div>
    </div>
  );
}
