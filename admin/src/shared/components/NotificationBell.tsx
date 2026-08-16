"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Trash2 } from "lucide-react";
import { useNotifications, type NotificationItem, formatNotificationTime } from "@/src/shared/context/notification.provider";

type NotificationBellProps = {
  viewAllHref?: string;
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
          className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-md dark:bg-[#0f172a] dark:border-slate-800"
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/60 dark:bg-slate-900/90 dark:border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-foreground dark:text-white">
                Notifications
              </p>
              <p className="text-xs text-muted-foreground dark:text-slate-400">
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
          <ul className="max-h-80 overflow-y-auto divide-y divide-border dark:divide-white/5 bg-popover dark:bg-[#0f172a]">
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted dark:bg-white/5 text-muted-foreground dark:text-slate-400">
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground dark:text-white">
                  No notifications yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400">
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
                      className={`block px-4 py-3 pr-10 transition-colors ${
                        !item.read
                          ? "bg-blue-50/70 hover:bg-blue-100/60 border-l-2 border-l-blue-600 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] dark:border-l-blue-500"
                          : "bg-transparent hover:bg-muted/40 dark:hover:bg-white/[0.03] border-l-2 border-l-transparent"
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
                          ? "bg-blue-50/70 hover:bg-blue-100/60 border-l-2 border-l-blue-600 dark:bg-white/[0.05] dark:hover:bg-white/[0.09] dark:border-l-blue-500"
                          : "bg-transparent hover:bg-muted/40 dark:hover:bg-white/[0.03] border-l-2 border-l-transparent"
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-white/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          {unreadCount > 0 && (
            <div className="border-t border-border bg-muted/60 dark:bg-slate-900/90 dark:border-slate-800 px-4 py-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
                className="block w-full text-center text-xs font-bold text-primary dark:text-blue-400 hover:underline cursor-pointer"
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
            ? "bg-muted-foreground/30 dark:bg-slate-600"
            : "bg-blue-600 dark:bg-blue-500 ring-2 ring-blue-600/30 dark:ring-blue-500/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            !item.read
              ? "font-bold text-foreground dark:text-white"
              : "font-semibold text-muted-foreground dark:text-slate-300"
          }`}
        >
          {item.title}
        </p>
        <p
          className={`mt-0.5 line-clamp-2 text-xs leading-relaxed ${
            !item.read
              ? "text-foreground/90 dark:text-slate-200"
              : "text-muted-foreground dark:text-slate-400"
          }`}
        >
          {item.message}
        </p>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground/80 dark:text-slate-400">
          {formatNotificationTime(item.createdAt || item.time)}
        </p>
      </div>
    </div>
  );
}
