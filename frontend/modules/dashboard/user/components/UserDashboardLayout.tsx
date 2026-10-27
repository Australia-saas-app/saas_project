"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Search,
  ArrowRight,
  Eye,
  ShoppingBag,
  ArrowUp,
  ArrowDown,
  Check,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EARNING_ROWS,
  WITHDRAW_ROWS,
  type WithdrawRow,
} from "@/src/modules/dashboard/shared/data/dashboard-demo-data";
import { DashboardTablePagination } from "@/src/modules/dashboard/shared/components/DashboardTablePagination";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { useUser } from "@/src/context/user.provider";
import { getWithdrawalsForUser, fetchWalletWithdrawalsFromDb } from "@/src/shared/lib/wallet-store";
import { getLogsForUser, LOG_ADDED_EVENT, type RealLogEntry } from "@/src/shared/lib/real-activity-logger";
import { readLocalProjects, fetchMyProjects, isProjectCompleted } from "@/src/modules/technical/services/technical.services";
import WithdrawalDetailsModal from "@/src/modules/dashboard/shared/components/WithdrawalDetailsModal";
import WithdrawalRevertAction from "@/src/modules/dashboard/shared/components/WithdrawalRevertAction";
import { UserStatsRow } from "./UserStatsRow";
import { USER_RECENT_ACTIVITY, USER_SERVICE_SHORTCUTS, USER_STATS, USER_ORDERS } from "../data/user-demo-data";
import axiosInstance from "@/src/shared/lib/axiosInstance";
import { scopedStorageKey } from "@/src/shared/lib/storage-scope";

const PAGE_SIZE = 10;

export default function UserDashboardLayout() {
  const { t } = useLocale();
  const { user } = useUser();
  const { demoOrEmpty, isDemo, userId } = useIsDemoAccount();
  const userEmail = user && "email" in user ? String((user as any).email) : "";
  const u = t.userPages.dashboard;
  const w = t.userPages.wallet;

  const [withdrawRows, setWithdrawRows] = useState<WithdrawRow[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = getWithdrawalsForUser(userId, [userEmail]).map((row) => {
        const s = String(row.status || "").toLowerCase();
        const status: "Approved" | "Rejected" | "Pending" =
          s === "approved" || s === "complete" || s === "paid" || s === "completed"
            ? "Approved"
            : s === "rejected" || s === "failed"
            ? "Rejected"
            : "Pending";
        return {
          id: row.id,
          method: row.method,
          amount: row.amount,
          date: row.date,
          createdAt: row.createdAt || row.date,
          status: status as any,
        } as any;
      });
      return stored;
    } catch {
      return [];
    }
  });
  const [realLogs, setRealLogs] = useState<RealLogEntry[]>([]);

  const [userProjects, setUserProjects] = useState<any[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return readLocalProjects();
    } catch {
      return [];
    }
  });

  const filterUserProjects = (projectsList: any[]) => {
    if (!Array.isArray(projectsList)) return [];
    if (!user && !userId) return projectsList;

    const uid = String(
      (user as any)?.id ||
        (user as any)?.userId ||
        (user as any)?.sub ||
        userId ||
        ""
    ).toLowerCase();
    const email = String((user as any)?.email || "").toLowerCase();
    const name = String(
      (user as any)?.name || (user as any)?.fullName || ""
    ).toLowerCase();

    return projectsList.filter((p: any) => {
      const pClientId = String(p.clientId || "").toLowerCase();
      const pCreatedBy = String(p.createdBy || "").toLowerCase();
      const pEmail = String(p.clientEmail || "").toLowerCase();
      const pName = String(p.clientName || "").toLowerCase();

      if (!pClientId && !pCreatedBy && !pEmail && !pName) return true;

      return (
        (uid && (pClientId === uid || pCreatedBy === uid)) ||
        (email &&
          (pEmail === email || pClientId === email || pCreatedBy === email)) ||
        (name && pName === name)
      );
    });
  };

  const loadProjects = async () => {
    try {
      const res = await fetchMyProjects();
      const list = res?.projects || readLocalProjects();
      setUserProjects(list);
    } catch {
      setUserProjects(readLocalProjects());
    }
  };

  const loadWithdrawals = async () => {
    try {
      // 1. Fetch from DB
      const dbRows = await fetchWalletWithdrawalsFromDb();

      // 2. Read local submissions
      const localStored = getWithdrawalsForUser(userId, [
        userEmail,
        (user as any)?.id,
        (user as any)?.userId,
        (user as any)?.sub,
      ]).map((row) => {
        const s = String(row.status || "").toLowerCase();
        const status: "Approved" | "Rejected" | "Pending" =
          s === "approved" || s === "complete" || s === "paid" || s === "completed"
            ? "Approved"
            : s === "rejected" || s === "failed"
            ? "Rejected"
            : "Pending";
        return {
          id: row.id,
          method: row.method,
          amount: row.amount,
          date: row.date,
          createdAt: row.createdAt || row.date,
          status: status as any,
          rejectionReason: (row as any).rejectionReason || (row as any).failureReason,
        } as any;
      });

      // 3. ATOMIC MERGE - No intermediate resets or vanishing records
      const merged = new Map<string, WithdrawRow>();

      // DB rows take precedence
      for (const d of dbRows) {
        const s = String(d.status || "").toLowerCase();
        const status: "Approved" | "Rejected" | "Pending" =
          s === "approved" || s === "complete" || s === "paid" || s === "completed"
            ? "Approved"
            : s === "rejected" || s === "failed"
            ? "Rejected"
            : "Pending";
        merged.set(d.id, {
          id: d.id,
          method: d.method,
          amount: d.amount,
          date: d.date,
          createdAt: d.createdAt || d.date,
          status: status as any,
          rejectionReason: (d as any).rejectionReason || (d as any).failureReason,
        } as any);
      }

      // Add local submissions
      for (const l of localStored) {
        if (!merged.has(l.id)) {
          merged.set(l.id, l);
        }
      }

      // If demo account and no real rows, include demo rows
      if (isDemo && merged.size === 0) {
        for (const r of WITHDRAW_ROWS) {
          if (!merged.has(r.id)) merged.set(r.id, r);
        }
      }

      setWithdrawRows(Array.from(merged.values()));
    } catch {}
  };

  const loadActivities = async () => {
    try {
      let logs = await getLogsForUser(userId);
      if ((!logs || logs.length === 0) && userId !== userEmail && userEmail) {
        logs = await getLogsForUser(userEmail);
      }
      if (Array.isArray(logs)) {
        const sorted = [...logs].sort((a, b) => {
          const tA = new Date(a.createdAt).getTime();
          const tB = new Date(b.createdAt).getTime();
          return tB - tA;
        });
        setRealLogs(sorted);
      } else {
        setRealLogs([]);
      }
    } catch {
      setRealLogs([]);
    }
  };

  useEffect(() => {
    loadWithdrawals();
    loadActivities();
    loadProjects();
  }, [userId, userEmail, isDemo]);

  useEffect(() => {
    const onUpdate = () => {
      loadWithdrawals();
      loadActivities();
      loadProjects();
    };

    // Instant real-time prepend when any log is recorded without needing reload
    const onLogAdded = (e: any) => {
      if (e?.detail && e.detail.id && e.detail.id !== "pending") {
        setRealLogs((prev) => {
          const updated = [e.detail, ...prev.filter((p) => p.id !== e.detail.id)];
          return updated.sort((a, b) => {
            const tA = new Date(a.createdAt).getTime();
            const tB = new Date(b.createdAt).getTime();
            return tB - tA;
          });
        });
      } else {
        loadActivities();
      }
    };

    window.addEventListener("wallet_updated", onUpdate);
    window.addEventListener("vero:withdrawal_updated", onUpdate);
    window.addEventListener("technical_projects_updated", onUpdate);
    window.addEventListener("platform_projects_updated", onUpdate);
    window.addEventListener("applied_projects_updated", onUpdate);
    window.addEventListener("project_milestones_updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);
    window.addEventListener("activity_logs_updated", onUpdate);
    window.addEventListener(LOG_ADDED_EVENT, onLogAdded);

    let bcVero: BroadcastChannel | null = null;
    let bcActivity: BroadcastChannel | null = null;
    let bcWallet: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bcVero = new BroadcastChannel("vero_channel");
        bcVero.onmessage = (e) => {
          if (e.data?.type === "vero:log_added") {
            loadActivities();
          }
          if (e.data?.type === "vero:withdrawal_updated") {
            loadWithdrawals();
          }
        };
        bcActivity = new BroadcastChannel("activity_channel");
        bcActivity.onmessage = onUpdate;
        bcWallet = new BroadcastChannel("wallet_channel");
        bcWallet.onmessage = onUpdate;
      }
    } catch {}

    // Auto-poll withdrawals from database every 4s without spamming project requests
    const interval = setInterval(loadWithdrawals, 4000);
    return () => {
      window.removeEventListener("wallet_updated", onUpdate);
      window.removeEventListener("vero:withdrawal_updated", onUpdate);
      window.removeEventListener("technical_projects_updated", onUpdate);
      window.removeEventListener("platform_projects_updated", onUpdate);
      window.removeEventListener("applied_projects_updated", onUpdate);
      window.removeEventListener("project_milestones_updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
      window.removeEventListener("activity_logs_updated", onUpdate);
      window.removeEventListener(LOG_ADDED_EVENT, onLogAdded);
      if (bcVero) try { bcVero.close(); } catch {}
      if (bcActivity) try { bcActivity.close(); } catch {}
      if (bcWallet) try { bcWallet.close(); } catch {}
      clearInterval(interval);
    };
  }, [userId, userEmail, isDemo]);

  const withdrawSource = isDemo && withdrawRows.length === 0 ? WITHDRAW_ROWS : withdrawRows;
  const earningSource = demoOrEmpty(EARNING_ROWS, [] as typeof EARNING_ROWS);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [chartMode, setChartMode] = useState<"financial" | "logs" | "projects">("logs");
  const [defaultMode, setDefaultMode] = useState<"financial" | "logs" | "projects">("logs");

  useEffect(() => {
    // 1. Try reading from user remote preferences in DB (synced across devices & relogins)
    const remotePref = (user as any)?.preferences?.chartDefaultMode;
    if (remotePref === "financial" || remotePref === "logs" || remotePref === "projects") {
      setDefaultMode(remotePref);
      setChartMode(remotePref);
      return;
    }

    // 2. Fall back to local user-scoped storage
    try {
      const scopedKey = scopedStorageKey("user_overview_default_mode");
      const saved = (localStorage.getItem(scopedKey) || localStorage.getItem("user_overview_default_mode")) as any;
      if (saved === "financial" || saved === "logs" || saved === "projects") {
        setDefaultMode(saved);
        setChartMode(saved);
      }
    } catch {}
  }, [user]);

  const handleSetDefaultMode = async (mode: "financial" | "logs" | "projects") => {
    setDefaultMode(mode);

    // 1. Instant local persistence
    try {
      const scopedKey = scopedStorageKey("user_overview_default_mode");
      localStorage.setItem(scopedKey, mode);
      localStorage.setItem("user_overview_default_mode", mode);
    } catch {}

    // 2. Persist to backend database (so it follows the account on any device & upon relogin)
    try {
      if (!isDemo) {
        await axiosInstance.patch("/sso/auth/user/preferences", {
          preferences: { chartDefaultMode: mode },
          chartDefaultMode: mode,
        });
        if (user && typeof user === "object") {
          (user as any).preferences = {
            ...((user as any).preferences || {}),
            chartDefaultMode: mode,
          };
        }
      }
    } catch (err) {
      console.warn("Could not sync preference to server", err);
    }

    const modeNames = {
      logs: "Activity Logs",
      financial: "Financial (Cashflow)",
      projects: "Projects & Orders",
    };
    toast.success(`Default overview set to ${modeNames[mode]}`);
  };

  const dynamicChartData = useMemo(() => {
    const yr = Number(selectedYear);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    // Clean zero-initialized data array for all 12 months - NO dummy baseline data
    const data = months.map((name) => ({
      name,
      Increase: 0,
      Decrease: 0,
    }));

    if (chartMode === "financial") {
      // 1. Only count real earnings
      for (const e of earningSource) {
        const t = (e as any).createdAt || (e as any).date;
        if (!t) continue;
        const d = new Date(t);
        if (!isNaN(d.getTime()) && d.getFullYear() === yr) {
          const m = d.getMonth();
          const comm = Number(String((e as any).commission || (e as any).amount || 0).replace(/[^0-9.]/g, "")) || 0;
          if (m >= 0 && m < 12) {
            data[m].Increase += Math.round(comm);
          }
        }
      }

      // 2. Only count APPROVED / COMPLETED withdrawals (pending withdrawals do NOT count as realized decrease)
      for (const w of withdrawSource) {
        const s = String(w.status || "").toLowerCase();
        const isApproved = s === "approved" || s === "complete" || s === "completed" || s === "paid";
        if (!isApproved) continue;

        const t = (w as any).createdAt || w.date;
        if (!t) continue;
        const d = new Date(t);
        if (!isNaN(d.getTime()) && d.getFullYear() === yr) {
          const m = d.getMonth();
          const amt = Number(String(w.amount).replace(/[^0-9.]/g, "")) || 0;
          if (m >= 0 && m < 12) {
            data[m].Decrease += Math.round(amt);
          }
        }
      }

      return data;
    }

    if (chartMode === "logs") {
      // Real logs only from DB & local storage
      for (const log of realLogs) {
        const t = log.createdAt || (log as any).date || (log as any).timestamp;
        if (!t) continue;
        const d = new Date(t);
        if (!isNaN(d.getTime()) && d.getFullYear() === yr) {
          const m = d.getMonth();
          if (m >= 0 && m < 12) {
            const isSystem = /withdraw|reject|fail|system|notice|warning|verify|security|error/i.test(
              `${log.action || ""} ${log.details || ""}`
            );
            if (isSystem) {
              data[m].Decrease += 1;
            } else {
              data[m].Increase += 1;
            }
          }
        }
      }

      return data;
    }

    // Projects & Orders mode - 100% REAL from user projects, NO dummy baseline
    const myProjects = filterUserProjects(userProjects);
    for (const p of myProjects) {
      const t = p.createdAt || p.date || p.startDate || p.updatedAt;
      if (!t) continue;
      const d = new Date(t);
      if (!isNaN(d.getTime()) && d.getFullYear() === yr) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          if (isProjectCompleted(p)) {
            data[m].Increase += 1;
          } else if (p.submissionStatus !== "rejected" && p.status !== "rejected") {
            data[m].Decrease += 1;
          }
        }
      }
    }

    return data;
  }, [selectedYear, chartMode, withdrawSource, earningSource, realLogs, userProjects, user, userId]);

  const legendInfo = useMemo(() => {
    switch (chartMode) {
      case "financial":
        return {
          increaseLabel: `${u.increase} (Earnings)`,
          decreaseLabel: `${u.decrease} (Withdrawals)`,
          unit: "$",
        };
      case "logs":
        return {
          increaseLabel: `${u.increase} (User Actions)`,
          decreaseLabel: `${u.decrease} (System Events)`,
          unit: "events",
        };
      case "projects":
        return {
          increaseLabel: `${u.increase} (Completed)`,
          decreaseLabel: `${u.decrease} (Pending / Active)`,
          unit: "items",
        };
    }
  }, [chartMode, u]);
  const userStats = demoOrEmpty(USER_STATS, {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalEarnings: "$0",
    totalWithdrawn: "$0",
    currentBalance: "$0",
    pendingPayments: 0,
    unreadNotices: 0,
    unreadMessages: 0,
  });

  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [earningSearch, setEarningSearch] = useState("");
  const [withdrawSort, setWithdrawSort] = useState<"Up" | "Down">("Down");
  const [earningSort, setEarningSort] = useState<"Up" | "Down">("Down");
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [earningPage, setEarningPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawRow | null>(null);

  const getWithdrawTime = (r: WithdrawRow): number => {
    if ((r as any).createdAt) {
      const t = new Date((r as any).createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (r.date) {
      const t = new Date(r.date).getTime();
      if (!isNaN(t) && t > 0) return t;
      const cleaned = r.date.replace(/\(UTC\)/i, "UTC").trim();
      const tCleaned = new Date(cleaned).getTime();
      if (!isNaN(tCleaned) && tCleaned > 0) return tCleaned;
    }
    return 0;
  };

  // Filtered withdrawals matching Wallet page
  const filteredWithdraw = useMemo(() => {
    const uniqueMap = new Map<string, WithdrawRow>();
    for (const r of withdrawSource) {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r);
      }
    }
    let rows = Array.from(uniqueMap.values()).map((row, index) => ({ row, index }));
    if (withdrawSearch.trim()) {
      const q = withdrawSearch.toLowerCase();
      rows = rows.filter(
        ({ row: r }) =>
          r.id.toLowerCase().includes(q) ||
          r.method.toLowerCase().includes(q) ||
          r.amount.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const tA = getWithdrawTime(a.row);
      const tB = getWithdrawTime(b.row);
      if (tA !== tB && tA > 0 && tB > 0) {
        return withdrawSort === "Down" ? tB - tA : tA - tB;
      }
      return withdrawSort === "Down" ? a.index - b.index : b.index - a.index;
    });
    return rows.map((item) => item.row);
  }, [withdrawSearch, withdrawSource, withdrawSort]);

  // Filtered earnings matching Wallet page
  const filteredEarning = useMemo(() => {
    let rows = earningSource.map((row, index) => ({ row, index }));
    if (earningSearch.trim()) {
      const q = earningSearch.toLowerCase();
      rows = rows.filter(
        ({ row: r }) =>
          r.id.toLowerCase().includes(q) ||
          r.subcategory.toLowerCase().includes(q) ||
          r.commission.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const tA = (a.row as any).date ? new Date((a.row as any).date).getTime() : 0;
      const tB = (b.row as any).date ? new Date((b.row as any).date).getTime() : 0;
      if (!isNaN(tA) && !isNaN(tB) && tA > 0 && tB > 0 && tA !== tB) {
        return earningSort === "Down" ? tB - tA : tA - tB;
      }
      return earningSort === "Down" ? a.index - b.index : b.index - a.index;
    });
    return rows.map((item) => item.row);
  }, [earningSearch, earningSource, earningSort]);

  const withdrawPages = Math.max(1, Math.ceil(filteredWithdraw.length / PAGE_SIZE));
  const earningPages = Math.max(1, Math.ceil(filteredEarning.length / PAGE_SIZE));
  const withdrawData = filteredWithdraw.slice(
    (withdrawPage - 1) * PAGE_SIZE,
    withdrawPage * PAGE_SIZE
  );
  const earningData = filteredEarning.slice((earningPage - 1) * PAGE_SIZE, earningPage * PAGE_SIZE);

  // Helper to format date & time stamp cleanly
  const formatTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr || "Recently";
      const date = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `${date}, ${time}`;
    } catch {
      return dateStr || "Recently";
    }
  };

  // Compute activities for Recent Activity card (top recent Actions)
  const displayActivities = useMemo(() => {
    if (realLogs.length > 0) {
      return realLogs.map((log: RealLogEntry) => ({
        id: log.id,
        action: log.action || log.details || "Activity",
        timestamp: formatTimestamp(log.createdAt),
      }));
    }
    return isDemo
      ? USER_RECENT_ACTIVITY.map((item, idx) => ({
          id: `demo-${idx}`,
          action: item.action,
          timestamp: item.date,
        }))
      : [];
  }, [realLogs, isDemo]);

  const quickLinks = [
    { label: t.dashboard.user.wallet, href: "/dashboard/user/wallet", desc: u.walletDesc },
    { label: t.dashboard.user.earnings, href: "/dashboard/user/earnings", desc: u.earningsDesc },
    { label: t.dashboard.user.applications, href: "/dashboard/user/applications", desc: "Manage Applications" },
    { label: t.dashboard.user.orders, href: "/dashboard/user/orders", desc: u.ordersDesc },
    {
      label: t.dashboard.user.notices,
      href: "/dashboard/user/notices",
      desc: u.noticesDesc,
      badge: userStats.unreadNotices,
    },
    {
      label: t.dashboard.user.messages,
      href: "/dashboard/user/messages",
      desc: u.messagesDesc,
      badge: userStats.unreadMessages,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{u.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{u.subtitle}</p>
      </div>

      <UserStatsRow />

      {/* Top Row: Activity Overview (remaining width) & Recent Activity Card (matching height & width) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0 items-stretch">
        {/* Activity Overview Card */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm h-full flex flex-col justify-between">
            <div>
              <div className="mb-6 flex flex-col gap-3">
                {/* Top Row: Title on Left, Legend on Right */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-md font-bold text-gray-900">{u.overview}</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                      <span className="h-3 w-3 rounded-full bg-[#0091ff]" />
                      {legendInfo.increaseLabel}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <span className="h-3 w-3 rounded-full bg-gray-400" />
                      {legendInfo.decreaseLabel}
                    </div>
                  </div>
                </div>

                {/* Second Row: Mode Dropdown, Set Default (if not default), and Year Selector */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <select
                      value={chartMode}
                      onChange={(e) => setChartMode(e.target.value as any)}
                      className="appearance-none rounded border border-gray-200 bg-white py-1 pr-6 pl-2.5 text-xs font-medium text-gray-700 focus:outline-none cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <option value="logs">
                        Activity Logs {defaultMode === "logs" ? "★ (Default)" : ""}
                      </option>
                      <option value="financial">
                        Financial (Cashflow) {defaultMode === "financial" ? "★ (Default)" : ""}
                      </option>
                      <option value="projects">
                        Projects & Orders {defaultMode === "projects" ? "★ (Default)" : ""}
                      </option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                  </div>

                  {chartMode !== defaultMode && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultMode(chartMode)}
                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-primary hover:border-primary/40 px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer"
                      title="Set this view as your permanent default"
                    >
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" /> Set Default
                    </button>
                  )}

                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="appearance-none rounded border border-gray-200 bg-white py-1 pr-6 pl-2.5 text-xs font-medium text-gray-700 focus:outline-none cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dynamicChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      domain={[0, (dataMax: number) => (dataMax && dataMax > 0 ? Math.ceil(dataMax * 1.25) : 5)]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: 12,
                      }}
                      formatter={(val: any, name: any) => [
                        chartMode === "financial" ? `$${Number(val).toLocaleString()}` : `${val} ${legendInfo.unit}`,
                        name,
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="Increase"
                      stroke="#0091ff"
                      strokeWidth={2.5}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (!payload || payload.Increase === 0) return <circle key={`dot-inc-${props.index}`} r={0} />;
                        return (
                          <circle
                            key={`dot-inc-${props.index}`}
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill="#0091ff"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 5, fill: "#0091ff", stroke: "#ffffff", strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      name={legendInfo.increaseLabel}
                    />
                    <Line
                      type="monotone"
                      dataKey="Decrease"
                      stroke="#94a3b8"
                      strokeWidth={2.5}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (!payload || payload.Decrease === 0) return <circle key={`dot-dec-${props.index}`} r={0} />;
                        return (
                          <circle
                            key={`dot-dec-${props.index}`}
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill="#94a3b8"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 5, fill: "#94a3b8", stroke: "#ffffff", strokeWidth: 2 }}
                      isAnimationActive={true}
                      animationDuration={600}
                      animationEasing="ease-in-out"
                      name={legendInfo.decreaseLabel}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Card (strictly matching Activity Overview height, never exceeding) */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm h-full flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="text-md font-bold text-gray-900">{u.recentActivity}</h3>
                <Link
                  href="/dashboard/user/profile/user-log"
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  {u.viewAll}
                </Link>
              </div>
              <div className="max-h-[280px] overflow-y-auto pr-1 space-y-0 divide-y divide-gray-100">
                {displayActivities.length === 0 ? (
                  <p className="py-12 text-center text-sm text-gray-400">No recent activity</p>
                ) : (
                  displayActivities.slice(0, 8).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between gap-3 py-2 text-xs first:pt-0 last:pb-0"
                    >
                      {/* Left side: Action */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <span
                          className="font-bold text-gray-900 truncate"
                          title={item.action}
                        >
                          {item.action}
                        </span>
                      </div>

                      {/* Right side: Date and Time stamp */}
                      <span className="text-gray-400 shrink-0 text-[11px] whitespace-nowrap font-medium text-right">
                        {item.timestamp}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width Withdrawal History Table (matching Wallet page layout and data) */}
      <div className="w-full rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-gray-900">{w.withdrawHistory}</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={w.search}
                value={withdrawSearch}
                onChange={(e) => {
                  setWithdrawSearch(e.target.value);
                  setWithdrawPage(1);
                }}
                className="w-full rounded border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setWithdrawSort((prev) => (prev === "Up" ? "Down" : "Up"));
                setWithdrawPage(1);
              }}
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
              title={withdrawSort === "Down" ? "Newest first (Click for Oldest first)" : "Oldest first (Click for Newest first)"}
            >
              {withdrawSort}
              {withdrawSort === "Up" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        {withdrawData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No withdrawals yet.</p>
        ) : (
          <div className="max-h-[216px] overflow-y-auto overflow-x-auto rounded border border-gray-100 touch-pan-x [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <table className="w-full text-xs min-w-[720px] table-auto">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary text-white uppercase font-bold text-[11px]">
                  <th className="p-3 text-left whitespace-nowrap min-w-[130px]">Transaction ID</th>
                  <th className="p-3 text-left min-w-[190px] max-w-[260px]">{w.method}</th>
                  <th className="p-3 text-left whitespace-nowrap min-w-[90px]">{w.amount}</th>
                  <th className="p-3 text-left whitespace-nowrap min-w-[140px]">Date</th>
                  <th className="p-3 text-left whitespace-nowrap min-w-[90px]">{w.status}</th>
                  <th className="p-3 text-right whitespace-nowrap min-w-[110px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawData.map((row, i) => (
                  <tr key={`${row.id}-${i}`} className="text-gray-700 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono font-semibold text-gray-900 text-xs whitespace-nowrap min-w-[130px]">{row.id}</td>
                    <td className="p-3 text-gray-700 break-words min-w-[190px] max-w-[260px] leading-relaxed">{row.method}</td>
                    <td className="p-3 font-semibold text-gray-900 whitespace-nowrap min-w-[90px]">{row.amount}</td>
                    <td className="p-3 text-gray-500 whitespace-nowrap min-w-[140px]">{row.date}</td>
                    <td className="p-3 whitespace-nowrap min-w-[90px]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === "Approved" || row.status === "Complete" || row.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : row.status === "Rejected" || row.status === "Failed"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap min-w-[110px]">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedWithdrawal(row)}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="View withdrawal info"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <WithdrawalRevertAction
                          withdrawal={{
                            id: row.id,
                            amount: row.amount,
                            method: row.method,
                            date: row.date,
                            createdAt: (row as any).createdAt || row.date,
                            status: row.status,
                            userId,
                          }}
                          onReverted={(id: string) => {
                            setWithdrawRows((prev) => prev.filter((r) => r.id !== id));
                            loadWithdrawals();
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DashboardTablePagination
          current={withdrawPage}
          total={withdrawPages}
          pageSize={PAGE_SIZE}
          totalItems={filteredWithdraw.length}
          onChange={setWithdrawPage}
          compact
        />
      </div>

      {/* Full-width Earning History Table (matching Wallet page layout and data, added below Withdrawal History) */}
      <div className="w-full rounded-xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-gray-900">{w.earningHistory}</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={w.search}
                value={earningSearch}
                onChange={(e) => {
                  setEarningSearch(e.target.value);
                  setEarningPage(1);
                }}
                className="w-full rounded border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setEarningSort((prev) => (prev === "Up" ? "Down" : "Up"));
                setEarningPage(1);
              }}
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
              title={earningSort === "Down" ? "Newest first (Click for Oldest first)" : "Oldest first (Click for Newest first)"}
            >
              {earningSort}
              {earningSort === "Up" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        {earningData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No earnings recorded yet.</p>
        ) : (
          <div className="max-h-[216px] overflow-y-auto overflow-x-auto rounded border border-gray-100 touch-pan-x [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <table className="w-full text-xs min-w-[640px] table-auto">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary text-white uppercase font-bold text-[11px]">
                  <th className="p-3 text-left whitespace-nowrap min-w-[120px]">ID</th>
                  <th className="p-3 text-left min-w-[200px] max-w-[320px]">{w.category}</th>
                  <th className="p-3 text-left whitespace-nowrap min-w-[100px]">{w.commission}</th>
                  <th className="p-3 text-left whitespace-nowrap min-w-[90px]">{w.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earningData.map((row, i) => (
                  <tr key={`${row.id}-${i}`} className="text-gray-700 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-semibold text-gray-900 whitespace-nowrap min-w-[120px]">{row.id}</td>
                    <td className="p-3 text-gray-700 break-words min-w-[200px] max-w-[320px] leading-relaxed">{row.subcategory}</td>
                    <td className="p-3 font-semibold text-gray-900 whitespace-nowrap min-w-[100px]">{row.commission}</td>
                    <td className="p-3 whitespace-nowrap min-w-[90px]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === "Complete" || row.status === "Approved" || row.status === "Paid"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DashboardTablePagination
          current={earningPage}
          total={earningPages}
          pageSize={PAGE_SIZE}
          totalItems={filteredEarning.length}
          onChange={setEarningPage}
          compact
        />
      </div>

      {/* Quick Links (Wallet, Earnings, Applications, Orders, Notices, Messages) - Commented out */}
      {/*
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group relative rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex flex-col justify-between"
          >
            {link.badge && link.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {link.badge}
              </span>
            )}
            <div>
              <p className="font-semibold text-gray-900 text-sm">{link.label}</p>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{link.desc}</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary mt-2 group-hover:underline">
              {u.open} <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>
      */}

      {/* Explore Services */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-gray-900">{u.serviceShortcuts || "Explore Services"}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {USER_SERVICE_SHORTCUTS.map((svc) => (
            <Link
              key={svc.href}
              href={svc.href}
              className="group relative rounded-xl border border-gray-100 bg-white p-3 sm:p-4 shadow-sm hover:border-primary/30 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900 text-xs sm:text-sm">{svc.label}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1 line-clamp-2">{svc.desc}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-primary mt-2 group-hover:underline">
                {u.open} <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Withdrawal Details Modal matching Wallet page */}
      <WithdrawalDetailsModal
        open={Boolean(selectedWithdrawal)}
        onClose={() => setSelectedWithdrawal(null)}
        withdrawal={selectedWithdrawal}
      />
    </div>
  );
}
