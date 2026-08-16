"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { type NotificationItem, formatNotificationTime } from "@/src/constants/notifications";
import { useNotifications } from "@/src/shared/context/notification.provider";

type NotificationBellProps = {
  viewAllHref: string;
  variant?: "light" | "dark";
  emptyLabel?: string;
};

export function NotificationBell({
  viewAllHref,
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
    ? "relative rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
    : "relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors";

  const panelClass = isDark
    ? "absolute right-0 top-full z-[99999] mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-slate-700 bg-[#0f172a] text-slate-100 shadow-2xl"
    : "absolute right-0 top-full z-[99999] mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl";

  return (
    <div ref={rootRef} className="relative z-[9999]">
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
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{ zIndex: 99999 }}
          className={panelClass}
          role="menu"
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-3 ${
              isDark ? "border-slate-800 bg-slate-900/90" : "border-gray-100 bg-gray-50/50"
            }`}
          >
            <div>
              <p className="text-sm font-bold">Notifications</p>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                {unreadCount > 0 ? `${unreadCount} unread` : emptyLabel}
              </p>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAllNotifications}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  isDark ? "text-red-400 hover:bg-red-400/10" : "text-red-600 hover:bg-red-50"
                }`}
              >
                Delete all
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
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
                      className={`block px-4 py-3 pr-10 transition-colors ${
                        isDark
                          ? !item.read
                            ? "bg-slate-800/90 hover:bg-slate-800 border-l-2 border-l-blue-500 text-white"
                            : "hover:bg-slate-800/40 bg-transparent text-slate-300"
                          : !item.read
                          ? "bg-blue-50/80 hover:bg-blue-100/70 border-l-2 border-l-blue-600 text-slate-900"
                          : "hover:bg-gray-50 bg-transparent text-slate-700"
                      }`}
                    >
                      <NotificationRow item={item} isDark={isDark} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => markRead(item.id)}
                      className={`block w-full px-4 py-3 pr-10 text-left transition-colors ${
                        isDark
                          ? !item.read
                            ? "bg-slate-800/90 hover:bg-slate-800 border-l-2 border-l-blue-500 text-white"
                            : "hover:bg-slate-800/40 bg-transparent text-slate-300"
                          : !item.read
                          ? "bg-blue-50/80 hover:bg-blue-100/70 border-l-2 border-l-blue-600 text-slate-900"
                          : "hover:bg-gray-50 bg-transparent text-slate-700"
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
                      isDark ? "text-slate-400 hover:bg-white/10 hover:text-red-400" : "text-gray-400 hover:bg-gray-200 hover:text-red-500"
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
              className={`border-t px-4 py-2.5 ${isDark ? "border-slate-800 bg-slate-900/90" : "border-gray-100 bg-gray-50"}`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
                className={`block w-full text-center text-xs font-bold ${
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

import { Trash2 } from "lucide-react";

function NotificationRow({ item, isDark }: { item: NotificationItem; isDark: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          item.read
            ? isDark
              ? "bg-slate-600"
              : "bg-gray-300"
            : "bg-blue-500 ring-2 ring-blue-500/40"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
          {item.title}
        </p>
        <p
          className={`mt-0.5 line-clamp-2 text-xs leading-relaxed ${
            isDark
              ? !item.read
                ? "text-slate-200 font-medium"
                : "text-slate-400"
              : !item.read
              ? "text-slate-800 font-medium"
              : "text-slate-600"
          }`}
        >
          {item.message}
        </p>
        <p className={`mt-1 text-[10px] ${isDark ? "text-slate-400 font-medium" : "text-slate-500"}`}>
          {formatNotificationTime(item.createdAt || item.time)}
        </p>
      </div>
    </div>
  );
}
