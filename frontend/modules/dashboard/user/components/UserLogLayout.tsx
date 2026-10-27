"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Search,
  UserIcon,
  Trash2,
  Calendar,
  Clock,
  Database,
  RefreshCcw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import {
  getUserEmailFromAuthUser,
  getUserIdFromAuthUser,
} from "@/src/shared/lib/demo-user";
import {
  getLogsForUser,
  deleteSingleLog,
  deleteAllLogs,
  LOG_ADDED_EVENT,
  formatLogCount,
  type RealLogEntry,
} from "@/src/shared/lib/real-activity-logger";

export type LogEntry = RealLogEntry;

export default function UserLogLayout() {
  const { user } = useUser();
  const userEmail = getUserEmailFromAuthUser(user) || "User";
  const userId = getUserIdFromAuthUser(user) || userEmail || "user";

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);

  const [isDeletingSingle, setIsDeletingSingle] = useState<string | null>(null);

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    fetchLogs();
    const handleLogAdded = () => fetchLogs();
    window.addEventListener(LOG_ADDED_EVENT, handleLogAdded);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (e) => {
          if (e.data?.type === "vero:log_added") {
            fetchLogs();
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener(LOG_ADDED_EVENT, handleLogAdded);
      if (bc) bc.close();
    };
  }, [userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction, filterDate, logsPerPage]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      await new Promise((res) => setTimeout(res, 500));
      let userLogs = await getLogsForUser(userId);
      if (userLogs.length === 0 && userId !== userEmail) {
        userLogs = await getLogsForUser(userEmail);
      }
      setLogs(userLogs);
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteLog = async (id: string) => {
    setIsDeletingSingle(id);
    try {
      await new Promise((res) => setTimeout(res, 400));
      await deleteSingleLog(userId, id);
      const updated = await getLogsForUser(userId);
      setLogs(updated);
      toast.success("Log entry deleted successfully");
    } catch {
      toast.error("Failed to delete log entry");
    } finally {
      setIsDeletingSingle(null);
    }
  };

  const handleDeleteAllLogs = async () => {
    setIsDeletingAll(true);
    try {
      await new Promise((res) => setTimeout(res, 500));
      await deleteAllLogs(userId);
      if (userId !== userEmail) {
        await deleteAllLogs(userEmail);
      }
      setLogs([]);
      setShowDeleteAllConfirm(false);
      toast.success("All activity logs deleted successfully");
    } catch {
      toast.error("Failed to delete all logs");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return dateStr;
    }
  };

  const formatAbsoluteTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return { date, time };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  const actionTypes = useMemo(() => {
    const types = new Set<string>();
    logs.forEach((l) => types.add(l.action));
    return Array.from(types).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchesSearch =
        (l.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.details || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.ipAddress || "").includes(searchTerm);
      const matchesAction = filterAction === "ALL" || l.action === filterAction;

      let matchesDate = true;
      if (filterDate) {
        try {
          const logDate = new Date(l.createdAt);
          const year = logDate.getFullYear();
          const month = String(logDate.getMonth() + 1).padStart(2, "0");
          const day = String(logDate.getDate()).padStart(2, "0");
          const localDateStr = `${year}-${month}-${day}`;
          matchesDate = localDateStr === filterDate;
        } catch {
          matchesDate = true;
        }
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, searchTerm, filterAction, filterDate]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const getActionColor = (action: string) => {
    if (action.includes("THREAT") || action.includes("BLOCKED") || action.includes("REJECTED") || action.includes("DISABLED") || action.includes("DELETE") || action.includes("REMOVED")) {
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
    if (action.includes("APPROVED") || action.includes("ENABLED") || action.includes("CREATE") || action.includes("LOGIN") || action.includes("ADDED")) {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("UPDATE") || action.includes("PHOTO")) {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    }
    if (action.includes("SUBMITTED") || action.includes("KYC") || action.includes("PASSWORD")) {
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  };

  const renderPagination = () => {
    const pages = [];
    let startPage = currentPage;
    let endPage = Math.min(startPage + 2, totalPages);

    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - 2);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          type="button"
          onClick={() => setCurrentPage(i)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            currentPage === i
              ? "bg-primary text-white shadow-md"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex items-center space-x-1.5">
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          &lt;
        </button>
        {pages}
        {endPage < totalPages && (
          <>
            <span className="text-muted-foreground px-1 tracking-widest">...</span>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-1 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
        >
          &gt;
        </button>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Delete ALL Logs Modal */}
      {showDeleteAllConfirm && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
          <div
            style={{ width: "360px", maxWidth: "calc(100vw - 32px)" }}
            className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-6 h-6 text-red-500" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Delete ALL Logs?</h3>
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
              Are you sure you want to permanently delete ALL audit logs?<br />
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-semibold text-foreground text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleDeleteAllLogs}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl font-semibold text-white text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete All"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground flex items-center">
              <FileText className="w-6 h-6 mr-2.5 text-primary" />
              User Activity Logs
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {formatLogCount(logs.length)}
            </span>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Full system-wide audit trailing (who did what, when).
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2">
          {logs.length >= 100 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium animate-in fade-in slide-in-from-bottom-1 duration-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Delete old logs for better performance and system storage</span>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={logs.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete All Logs</span>
            </button>
            <button
              type="button"
              onClick={fetchLogs}
              title="Refresh Logs"
              className="flex items-center justify-center p-2.5 bg-card hover:bg-accent border border-border text-foreground rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCcw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Search by username, details, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-input rounded-lg leading-5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm transition-colors"
          />
        </div>

        <div className="md:w-48">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="block w-full px-3 py-2 border border-input rounded-lg leading-5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm transition-colors"
          />
        </div>

        <div className="md:w-64">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 border border-input rounded-lg leading-5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm transition-colors appearance-none"
          >
            <option value="ALL">All Actions</option>
            {actionTypes.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table - Columns matching page.tsx: Timestamp, User, Action, Details, IP Address, Delete */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto min-h-[400px] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 transition-all">
          <table className="w-full min-w-[900px] text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-4 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">
                  Delete
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    <RefreshCcw className="w-8 h-8 animate-spin mx-auto text-primary mb-4 opacity-50" />
                    <p className="text-sm font-medium">Loading audit logs...</p>
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                      <Search className="w-6 h-6 opacity-50" />
                    </div>
                    <p className="text-foreground font-semibold">No logs match your search criteria.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterDate("");
                        setFilterAction("ALL");
                      }}
                      className="mt-3 text-primary hover:underline text-sm font-medium cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => {
                  const colorStyle = getActionColor(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-foreground text-sm font-medium">
                            {formatAbsoluteTime(log.createdAt).date}
                          </span>
                          <span className="text-muted-foreground text-xs mt-0.5 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatAbsoluteTime(log.createdAt).time}
                          </span>
                          <span className="text-muted-foreground text-xs mt-0.5 flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatRelativeTime(log.createdAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-inner">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium text-sm">
                              {log.username || "System/Unknown"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md border shadow-2xs ${colorStyle}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[250px]">
                        <div className="text-muted-foreground text-sm break-words whitespace-normal" title={log.details}>
                          {log.details}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm font-mono">
                        {log.ipAddress?.replace(/^::ffff:/, "") || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          disabled={isDeletingSingle === log.id}
                          onClick={() => confirmDeleteLog(log.id)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete log"
                        >
                          {isDeletingSingle === log.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
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
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <div className="flex items-center space-4">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-primary/70" />
              <span>
                Showing {currentLogs.length > 0 ? (currentPage - 1) * logsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {formatLogCount(filteredLogs.length)} results
              </span>
            </div>

            <div className="flex items-center space-x-2 pl-4 border-l border-border">
              <label htmlFor="perPage" className="text-xs">
                Logs per page:
              </label>
              <select
                id="perPage"
                value={logsPerPage}
                onChange={(e) => setLogsPerPage(Number(e.target.value))}
                className="bg-background border border-input rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={75}>75</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {renderPagination()}
        </div>
      </div>
    </div>
  );
}
