"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { useNotifications, type NotificationItem, formatNotificationTime } from "@/src/shared/context/notification.provider";

type NotificationBellProps = {
  viewAllHref?: string;
  variant?: "light" | "dark";
  emptyLabel?: string;
};

export function NotificationBell({
  viewAllHref = "/notifications",
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
        className="relative p-2 hover:bg-muted/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white border-2 border-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{ zIndex: 999999 }}
          className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl backdrop-blur-md"
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : emptyLabel}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
              >
                Delete all
              </button>
            )}
          </div>

          {/* List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-border bg-card">
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications yet</p>
                <p className="mt-1 text-xs text-muted-foreground">{emptyLabel}</p>
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
                      className={`block px-4 py-3 pr-10 transition-colors ${
                        !item.read
                          ? "bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 border-l-2 border-l-blue-500"
                          : "bg-transparent hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <NotificationRow item={item} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className={`block w-full px-4 py-3 pr-10 text-left transition-colors cursor-pointer ${
                        !item.read
                          ? "bg-blue-500/5 dark:bg-blue-500/10 hover:bg-blue-500/10 dark:hover:bg-blue-500/15 border-l-2 border-l-blue-500"
                          : "bg-transparent hover:bg-muted/40 text-muted-foreground"
                      }`}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="border-t border-border px-4 py-2.5 bg-muted/30">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
                className="block w-full text-center text-xs font-bold text-primary hover:underline cursor-pointer"
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
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          item.read
            ? "bg-muted-foreground/30"
            : "bg-blue-500 ring-2 ring-blue-500/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold ${!item.read ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300 font-semibold"}`}>
          {item.title}
        </p>
        <p
          className={`mt-0.5 line-clamp-2 text-xs leading-relaxed ${
            !item.read
              ? "text-slate-700 dark:text-slate-200"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {item.message}
        </p>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-400 font-medium">
          {formatNotificationTime(item.createdAt || item.time)}
        </p>
      </div>
    </div>
  );
}
