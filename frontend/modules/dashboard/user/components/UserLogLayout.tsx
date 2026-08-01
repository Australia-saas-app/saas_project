"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  UserIcon,
  Trash2,
  Calendar,
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
  const [logsPerPage, setLogsPerPage] = useState(25);

  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    fetchLogs();
    const handleLogAdded = () => fetchLogs();
    window.addEventListener(LOG_ADDED_EVENT, handleLogAdded);
    return () => window.removeEventListener(LOG_ADDED_EVENT, handleLogAdded);
  }, [userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterAction, filterDate, logsPerPage]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let userLogs = getLogsForUser(userId);
      if (userLogs.length === 0 && userId !== userEmail) {
        userLogs = getLogsForUser(userEmail);
      }
      setLogs(userLogs);
    } catch (err) {
      console.error("Failed to fetch activity logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;
    setIsDeletingSingle(true);
    try {
      await new Promise((res) => setTimeout(res, 400));
      const updated = deleteSingleLog(userId, logToDelete);
      setLogs(updated);
      toast.success("Log entry deleted successfully");
    } catch {
      toast.error("Failed to delete log entry");
    } finally {
      setIsDeletingSingle(false);
      setLogToDelete(null);
    }
  };

  const handleDeleteAllLogs = async () => {
    setIsDeletingAll(true);
    try {
      await new Promise((res) => setTimeout(res, 500));
      deleteAllLogs(userId);
      deleteAllLogs(userEmail);
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
      return new Date(dateStr).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return dateStr;
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
    if (action.includes("THREAT") || action.includes("BLOCKED") || action.includes("REJECTED") || action.includes("DISABLED")) {
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    }
    if (action.includes("APPROVED") || action.includes("ENABLED") || action.includes("CREATE") || action.includes("LOGIN")) {
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
    if (totalPages <= 1) return null;

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
            <span className="text-muted-foreground px-1 tracking-widest">.......</span>
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
      {/* Delete Single Log Modal */}
      {logToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center space-x-3 mb-4 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete Log Entry?</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently delete this audit log? This action cannot be undone and will remove it from the database completely.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={() => setLogToDelete(null)}
                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={confirmDeleteLog}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingSingle && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Yes, Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ALL Logs Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center space-x-3 mb-4 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Delete ALL Logs?</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently delete ALL audit logs? This action cannot be undone and will completely wipe the database log table.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={handleDeleteAllLogs}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingAll && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Yes, Delete All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center">
            <FileText className="w-6 h-6 mr-2.5 text-primary" />
            User Activity Logs
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Full system-wide audit trailing (who did what, when).
          </p>
        </div>

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
            className="flex items-center space-x-2 px-4 py-2 bg-card hover:bg-accent border border-border text-foreground text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Logs</span>
          </button>
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
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
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
                            {formatAbsoluteTime(log.createdAt)}
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
                          <span className="text-foreground font-medium text-sm">
                            {log.username || "System/Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase rounded-md border shadow-2xs ${colorStyle}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-muted-foreground text-sm max-w-md line-clamp-2" title={log.details}>
                          {log.details}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm font-mono">
                        {log.ipAddress?.replace(/^::ffff:/, "") || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => setLogToDelete(log.id)}
                          className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete log"
                        >
                          <Trash2 className="w-4 h-4" />
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
                {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} results
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
