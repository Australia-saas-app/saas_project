"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Trash2,
  RefreshCw,
  CheckCheck,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useNotifications, type NotificationItem, formatNotificationTime } from "@/src/shared/context/notification.provider";

interface DashboardNotificationsLayoutProps {
  title?: string;
  subtitle?: string;
}

export default function DashboardNotificationsLayout({
  title = "Notifications",
  subtitle = "Stay updated with your latest alerts, updates, and activities.",
}: DashboardNotificationsLayoutProps) {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  } = useNotifications();

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination calculation
  const totalItems = notifications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return notifications.slice(startIndex, startIndex + pageSize);
  }, [notifications, currentPage, pageSize]);

  // Handle Refresh with spinning animation
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (typeof refreshNotifications === "function") {
        await refreshNotifications();
      }
      // Guarantee visible spin feedback for smooth UX
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Notifications refreshed");
    } catch {
      toast.error("Failed to refresh notifications");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Delete All with confirmation modal and spin
  const handleConfirmDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      deleteAllNotifications();
      setShowDeleteModal(false);
      setPage(1);
    } catch {
      toast.error("Failed to delete all notifications");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Handle individual delete with feedback
  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      deleteNotification(id);
      if (paginatedNotifications.length === 1 && currentPage > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Format full timestamp for date column
  const formatFullDate = (createdAt?: string | Date) => {
    if (!createdAt) return "Recent";
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "Recent";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Helper for notification type icon
  const getNotificationIcon = (type?: string, title?: string) => {
    const combined = `${type || ""} ${title || ""}`.toLowerCase();
    if (combined.includes("approved") || combined.includes("success") || combined.includes("verified")) {
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    }
    if (combined.includes("reject") || combined.includes("failed") || combined.includes("error")) {
      return <AlertCircle className="h-5 w-5 text-rose-500" />;
    }
    if (combined.includes("pending") || combined.includes("warning") || combined.includes("kyc")) {
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/70 transition-all cursor-pointer shadow-xs"
            >
              <CheckCheck className="h-4 w-4 text-blue-500" />
              <span>Mark all as read</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/70 transition-all cursor-pointer shadow-xs disabled:opacity-60"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Delete All Button */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={totalItems === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            title="Delete all notifications"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete all</span>
          </button>
        </div>
      </div>

      {/* Main Notifications Table Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Container with custom scrollbar */}
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          <table className="w-full text-left text-sm border-collapse min-w-[650px]">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="w-16 px-4 py-3.5 text-center">
                  #
                </th>
                <th scope="col" className="px-5 py-3.5">
                  Notification
                </th>
                <th scope="col" className="w-56 px-5 py-3.5">
                  Date &amp; Timestamp
                </th>
                <th scope="col" className="w-20 px-4 py-3.5 text-center">
                  Action
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border">
              {paginatedNotifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
                      <Bell className="h-7 w-7 opacity-60" />
                    </div>
                    <p className="text-base font-semibold text-foreground">No notifications found</p>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                      You are all caught up! When you receive alerts, approvals, or system notices, they will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedNotifications.map((item, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  const isItemDeleting = deletingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => !item.read && markRead(item.id)}
                      className={`group transition-colors hover:bg-muted/40 cursor-pointer ${
                        !item.read ? "bg-primary/[0.03] dark:bg-primary/[0.05]" : ""
                      }`}
                    >
                      {/* Column 1: Row Number */}
                      <td className="px-4 py-4 text-center font-mono text-xs font-medium text-muted-foreground">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted/70 px-1.5 text-foreground font-semibold">
                          {rowNumber}
                        </span>
                      </td>

                      {/* Column 2: Notification Details */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className="mt-0.5 shrink-0 rounded-lg p-1.5 bg-muted/60">
                            {getNotificationIcon(item.type, item.title)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm ${
                                  !item.read
                                    ? "font-bold text-foreground"
                                    : "font-medium text-foreground/90"
                                }`}
                              >
                                {item.title}
                              </span>
                              {!item.read && (
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background shrink-0" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                            {item.href && (
                              <Link
                                href={item.href}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markRead(item.id);
                                }}
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                              >
                                <span>View details</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Date & Timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs font-semibold text-foreground">
                          {formatFullDate(item.createdAt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.time || formatNotificationTime(item.createdAt)}
                        </p>
                      </td>

                      {/* Column 4: Delete Trash Icon */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOne(item.id, e)}
                          disabled={isItemDeleting}
                          aria-label={`Delete notification ${item.title}`}
                          title="Delete notification"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isItemDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border px-5 py-3.5 bg-card">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * pageSize, totalItems)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{totalItems}</span> notifications
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;

                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-1 text-xs text-muted-foreground">…</span>}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors cursor-pointer ${
                            p === currentPage
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-foreground hover:bg-muted/70"
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-all-title"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 id="delete-all-title" className="text-lg font-bold text-foreground">
                  Delete all notifications?
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently delete all {totalItems} notification{totalItems === 1 ? "" : "s"}? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAll}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-medium text-foreground hover:bg-muted/70 transition-colors cursor-pointer disabled:opacity-50"
              >
                No, cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-70"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting all...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Yes, delete all</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
