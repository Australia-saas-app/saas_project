"use client";

import React, { useMemo, useState } from "react";
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
  ShieldAlert,
  User,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  useNotifications,
  type NotificationItem,
  formatNotificationTime,
} from "@/src/shared/context/notification.provider";

export type RoleFilter = "ALL" | "USER" | "BUSINESS" | "AFFILIATE";

// Robust role classification based on payload metadata, href patterns, and notification content
export function resolveNotificationRole(item: NotificationItem): "USER" | "BUSINESS" | "AFFILIATE" {
  const explicit = String(
    item.role || item.targetRole || item.data?.role || item.data?.targetRole || ""
  ).toUpperCase();
  if (explicit.includes("AFFILIATE")) return "AFFILIATE";
  if (explicit.includes("BUSINESS")) return "BUSINESS";
  if (explicit.includes("USER")) return "USER";

  const href = String(item.href || "").toLowerCase();
  if (href.includes("/affiliate") || href.includes("affiliates")) return "AFFILIATE";
  if (href.includes("/business") || href.includes("businesses")) return "BUSINESS";
  if (href.includes("/user") || href.includes("all-users")) return "USER";

  const text = `${item.title || ""} ${item.message || ""} ${item.type || ""}`.toLowerCase();
  if (text.includes("affiliate") || text.includes("commission") || text.includes("referral") || text.includes("promotions")) {
    return "AFFILIATE";
  }
  if (text.includes("business") || text.includes("campaign") || text.includes("corporate") || text.includes("client") || text.includes("company")) {
    return "BUSINESS";
  }

  // Default to general USER for personal orders, user registrations, and general KYC
  return "USER";
}

export default function AdminNotificationsLayout() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<RoleFilter>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calculate role counts across all notifications
  const roleCounts = useMemo(() => {
    const counts = {
      ALL: notifications.length,
      USER: 0,
      BUSINESS: 0,
      AFFILIATE: 0,
    };
    notifications.forEach((item) => {
      const r = resolveNotificationRole(item);
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  // Filter notifications according to the active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    return notifications.filter((item) => resolveNotificationRole(item) === activeTab);
  }, [notifications, activeTab]);

  // Pagination calculation
  const totalFiltered = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  // Handle Tab Switch
  const handleTabChange = (tab: RoleFilter) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Handle Refresh with spinning animation
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (typeof refreshNotifications === "function") {
        await refreshNotifications();
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
      toast.success("Admin notifications refreshed");
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
    if (combined.includes("approved") || combined.includes("verified") || combined.includes("success")) {
      return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (combined.includes("reject") || combined.includes("denied") || combined.includes("error") || combined.includes("suspicious")) {
      return <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />;
    }
    if (combined.includes("kyc") || combined.includes("pending") || combined.includes("review") || combined.includes("applied")) {
      return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
    }
    return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
  };

  // Helper for Role badge styling and icon
  const renderRoleBadge = (role: "USER" | "BUSINESS" | "AFFILIATE") => {
    switch (role) {
      case "USER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>USER</span>
          </span>
        );
      case "BUSINESS":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 border border-purple-500/20">
            <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            <span>BUSINESS</span>
          </span>
        );
      case "AFFILIATE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
            <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>AFFILIATE</span>
          </span>
        );
    }
  };

  const tabs: { id: RoleFilter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "USER", label: "User" },
    { id: "BUSINESS", label: "Business" },
    { id: "AFFILIATE", label: "Affiliate" },
  ];

  return (
    <div className="p-4 sm:p-6 w-full max-w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Admin Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Comprehensive system alerts across all user sides: User, Business, and Affiliate operations.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
            >
              <CheckCheck className="h-4 w-4 text-blue-600" />
              <span>Mark all as read</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm disabled:opacity-60"
            title="Refresh notifications"
            aria-label="Refresh notifications"
          >
            <RefreshCw
              className={`h-4 w-4 text-gray-500 dark:text-gray-400 ${
                isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : ""
              }`}
            />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Delete All Button */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            title="Delete all notifications"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete all</span>
          </button>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex gap-2.5 flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = roleCounts[tab.id];

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border shadow-xs flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-slate-800"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-white text-blue-600"
                    : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Notifications Table Card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Table Container with custom scrollbar: 4 notifications visible, then scrollbar scrolls up to 10 per page */}
        <div className="max-h-[355px] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
          <table className="w-full text-left text-sm border-collapse min-w-[750px]">
            {/* Table Header (Sticky) */}
            <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-slate-800/90 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th scope="col" className="w-16 px-4 py-3.5 text-center">
                  #
                </th>
                <th scope="col" className="w-32 px-4 py-3.5 text-center">
                  Role
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
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {paginatedNotifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 mb-3">
                      <Bell className="h-7 w-7 opacity-60" />
                    </div>
                    <p className="text-base font-semibold text-gray-900 dark:text-white">
                      No notifications found {activeTab !== "ALL" ? `for ${activeTab}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                      All caught up! System logs, incoming submissions, and role alerts will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedNotifications.map((item, index) => {
                  const rowNumber = (currentPage - 1) * pageSize + index + 1;
                  const isItemDeleting = deletingId === item.id;
                  const itemRole = resolveNotificationRole(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => !item.read && markRead(item.id)}
                      className={`group transition-colors hover:bg-gray-50/80 dark:hover:bg-slate-800/40 cursor-pointer ${
                        !item.read
                          ? "bg-blue-50/40 dark:bg-blue-950/20"
                          : ""
                      }`}
                    >
                      {/* Column 1: Row Number */}
                      <td className="px-4 py-4 text-center font-mono text-xs font-medium text-gray-500 dark:text-gray-400">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gray-100 dark:bg-slate-800 px-1.5 text-gray-700 dark:text-gray-300 font-semibold">
                          {rowNumber}
                        </span>
                      </td>

                      {/* Column 2: Role Badge */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {renderRoleBadge(itemRole)}
                      </td>

                      {/* Column 3: Notification Details */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className="mt-0.5 shrink-0 rounded-lg p-1.5 bg-gray-100 dark:bg-slate-800">
                            {getNotificationIcon(item.type, item.title)}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm ${
                                  !item.read
                                    ? "font-bold text-gray-900 dark:text-white"
                                    : "font-medium text-gray-800 dark:text-gray-200"
                                }`}
                              >
                                {item.title}
                              </span>
                              {!item.read && (
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white dark:ring-slate-900 shrink-0" />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                            {item.href && (
                              <Link
                                href={item.href}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markRead(item.id);
                                }}
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <span>View details</span>
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Date & Timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">
                          {formatFullDate(item.createdAt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {item.time || formatNotificationTime(item.createdAt)}
                        </p>
                      </td>

                      {/* Column 5: Delete Trash Icon */}
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOne(item.id, e)}
                          disabled={isItemDeleting}
                          aria-label={`Delete notification ${item.title}`}
                          title="Delete notification"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
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
        {totalFiltered > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 dark:border-gray-800 px-5 py-3.5 bg-white dark:bg-slate-900">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {(currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.min(currentPage * pageSize, totalFiltered)}
              </span>{" "}
              of <span className="font-semibold text-gray-900 dark:text-white">{totalFiltered}</span>{" "}
              {activeTab !== "ALL" ? `${activeTab.toLowerCase()} ` : ""}notifications
            </p>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
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
                        {showEllipsis && <span className="px-1 text-xs text-gray-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition-colors cursor-pointer ${
                            p === currentPage
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
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
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
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
            className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-delete-all-title"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 id="admin-delete-all-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  Delete all notifications?
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Are you sure you want to permanently clear all {notifications.length} admin notification{notifications.length === 1 ? "" : "s"}? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingAll}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                No, cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                disabled={isDeletingAll}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-70"
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
