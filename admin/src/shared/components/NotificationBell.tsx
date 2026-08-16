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
  variant = "light",
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

  const isDark = variant === "dark";
  const buttonClass = isDark
    ? "relative p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-gray-100"
    : "relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900";

  const panelClass = isDark
    ? "absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-white shadow-2xl"
    : "absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={buttonClass}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white border-2 border-white dark:border-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={panelClass} role="menu">
          <div
            className={`flex items-center justify-between border-b px-4 py-3 ${
              isDark ? "border-gray-800" : "border-gray-100"
            }`}
          >
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {unreadCount > 0 ? `${unreadCount} unread` : emptyLabel}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                  isDark ? "text-red-400 hover:bg-red-400/10" : "text-red-600 hover:bg-red-50"
                }`}
              >
                Delete all
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${isDark ? "bg-white/5 text-slate-500" : "bg-gray-50 text-gray-400"}`}>
                  <Bell className="h-6 w-6 opacity-50" />
                </div>
                <p className={`text-sm font-medium ${isDark ? "text-slate-300" : "text-gray-600"}`}>No notifications yet</p>
                <p className={`mt-1 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>{emptyLabel}</p>
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
                      className={`block border-b px-4 py-3 pr-10 transition-colors last:border-0 ${
                        isDark
                          ? `border-gray-800 hover:bg-gray-800/50 ${!item.read ? "bg-gray-800/30" : "bg-transparent"}`
                          : `border-gray-50 hover:bg-gray-50 ${!item.read ? "bg-blue-50/50" : "bg-transparent"}`
                      }`}
                    >
                      <NotificationRow item={item} isDark={isDark} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className={`block w-full border-b px-4 py-3 pr-10 text-left transition-colors last:border-0 ${
                        isDark
                          ? `border-gray-800 hover:bg-gray-800/50 ${!item.read ? "bg-gray-800/30" : "bg-transparent"}`
                          : `border-gray-50 hover:bg-gray-50 ${!item.read ? "bg-blue-50/50" : "bg-transparent"}`
                      }`}
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
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                      isDark ? "text-gray-400 hover:bg-gray-800 hover:text-red-400" : "text-gray-400 hover:bg-gray-200 hover:text-red-500"
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          {unreadCount > 0 && (
            <div
              className={`border-t px-4 py-2.5 ${isDark ? "border-gray-800 bg-gray-900/50" : "border-gray-100 bg-gray-50"}`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
                className={`block w-full text-center text-xs font-semibold ${
                  isDark ? "text-blue-400 hover:text-blue-300" : "text-primary hover:underline"
                }`}
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
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          item.read ? (isDark ? "bg-gray-600" : "bg-gray-300") : "bg-blue-500"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        <p className={`mt-0.5 line-clamp-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {item.message}
        </p>
        <p className={`mt-1 text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          {formatNotificationTime(item.createdAt || item.time)}
        </p>
      </div>
    </div>
  );
}
