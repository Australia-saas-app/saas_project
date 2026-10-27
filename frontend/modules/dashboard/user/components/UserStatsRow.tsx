"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { useUser } from "@/src/context/user.provider";
import { USER_STATS } from "../data/user-demo-data";
import {
  readLocalProjects,
  fetchMyProjects,
  isProjectCompleted,
  fetchWalletBalance,
} from "@/src/modules/technical/services/technical.services";
import {
  getWithdrawalsForUser,
  fetchWalletWithdrawalsFromDb,
} from "@/src/shared/lib/wallet-store";

interface StatsState {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalEarnings: number;
  totalWithdrawn: number;
  currentBalance: number;
  loaded: boolean;
}

export function UserStatsRow() {
  const { t } = useLocale();
  const { user } = useUser();
  const { userId, isDemo } = useIsDemoAccount();
  const u = t.userPages.dashboard;

  // Compute matching user projects helper
  const filterUserProjects = useCallback(
    (projectsList: any[]) => {
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

        // If project has no owner tags at all (e.g. freshly created locally without ID), allow it
        if (!pClientId && !pCreatedBy && !pEmail && !pName) return true;

        return (
          (uid && (pClientId === uid || pCreatedBy === uid)) ||
          (email &&
            (pEmail === email || pClientId === email || pCreatedBy === email)) ||
          (name && pName === name)
        );
      });
    },
    [user, userId]
  );

  // Initial calculation from local cached data so there is zero flash/lag on initial render
  const initialData = useMemo(() => {
    try {
      const localProjects = readLocalProjects();
      const userProjects = filterUserProjects(localProjects);
      const totalProjects = userProjects.length;
      const completedProjects = userProjects.filter((p) =>
        isProjectCompleted(p)
      ).length;
      const activeProjects = userProjects.filter(
        (p) =>
          !isProjectCompleted(p) &&
          p.submissionStatus !== "rejected" &&
          p.submissionStatus !== "cancelled" &&
          p.status !== "rejected"
      ).length;

      // Calculate initial approved withdrawals from local store
      const localWithdrawals = getWithdrawalsForUser(userId);
      let localApprovedWithdrawn = 0;
      for (const w of localWithdrawals) {
        const s = String(w.status || "").toLowerCase();
        if (
          s === "approved" ||
          s === "complete" ||
          s === "completed" ||
          s === "paid"
        ) {
          const amt =
            typeof w.amount === "number"
              ? w.amount
              : parseFloat(String(w.amount || "").replace(/[^0-9.]/g, "")) || 0;
          localApprovedWithdrawn += amt;
        }
      }

      return {
        totalProjects,
        activeProjects,
        completedProjects,
        totalEarnings: 0,
        totalWithdrawn: localApprovedWithdrawn,
        currentBalance: 0,
        loaded: false,
      };
    } catch {
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        currentBalance: 0,
        loaded: false,
      };
    }
  }, [filterUserProjects, userId]);

  const [stats, setStats] = useState<StatsState>(initialData);

  const syncStats = useCallback(async () => {
    try {
      // 1. Projects sync (database + persistent cache)
      let projectList: any[] = [];
      try {
        const res = await fetchMyProjects();
        projectList = res?.projects || readLocalProjects();
      } catch {
        projectList = readLocalProjects();
      }
      const myProjects = filterUserProjects(projectList);
      const totalProjects = myProjects.length;
      const completedProjects = myProjects.filter((p) =>
        isProjectCompleted(p)
      ).length;
      const activeProjects = myProjects.filter(
        (p) =>
          !isProjectCompleted(p) &&
          p.submissionStatus !== "rejected" &&
          p.submissionStatus !== "cancelled" &&
          p.status !== "rejected"
      ).length;

      // 2. Wallet balance & earnings sync
      let currentBalance = 0;
      let totalEarned = 0;
      let walletWithdrawn = 0;
      try {
        const balRes = await fetchWalletBalance(user);
        if (balRes) {
          currentBalance = Number(balRes.balance || 0);
          totalEarned = Number(balRes.totalEarned || 0);
          walletWithdrawn = Number(balRes.totalWithdrawn || 0);
        }
      } catch {}

      // 3. Withdrawals sync (shows total withdrawal after request approve by admin)
      let approvedWithdrawalSum = 0;
      try {
        const uniqueWithdrawals = new Map<
          string,
          { amount: any; status: string }
        >();

        // Gather from local storage store
        const localList = getWithdrawalsForUser(userId);
        for (const item of localList) {
          if (item?.id) {
            uniqueWithdrawals.set(String(item.id), {
              amount: item.amount,
              status: item.status,
            });
          }
        }

        // Gather fresh from database
        const dbList = await fetchWalletWithdrawalsFromDb();
        for (const item of dbList) {
          if (item?.id) {
            uniqueWithdrawals.set(String(item.id), {
              amount: item.amount,
              status: item.status,
            });
          }
        }

        // Sum only withdrawals approved / completed by admin
        uniqueWithdrawals.forEach((record) => {
          const s = String(record.status || "").toLowerCase();
          if (
            s === "approved" ||
            s === "complete" ||
            s === "completed" ||
            s === "paid"
          ) {
            const amt =
              typeof record.amount === "number"
                ? record.amount
                : parseFloat(
                    String(record.amount || "").replace(/[^0-9.]/g, "")
                  ) || 0;
            approvedWithdrawalSum += amt;
          }
        });
      } catch {}

      const finalWithdrawn = Math.max(approvedWithdrawalSum, walletWithdrawn);

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        totalEarnings: totalEarned,
        totalWithdrawn: finalWithdrawn,
        currentBalance,
        loaded: true,
      });
    } catch {}
  }, [filterUserProjects, user, userId]);

  useEffect(() => {
    // Initial fetch on mount or user ready
    syncStats();

    // Real-time event listeners across tabs and components
    const handleUpdate = () => {
      syncStats();
    };

    window.addEventListener("wallet_updated", handleUpdate);
    window.addEventListener("vero:withdrawal_updated", handleUpdate);
    window.addEventListener("technical_projects_updated", handleUpdate);
    window.addEventListener("platform_projects_updated", handleUpdate);
    window.addEventListener("applied_projects_updated", handleUpdate);
    window.addEventListener("project_milestones_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    document.addEventListener("visibilitychange", handleUpdate);

    // Cross-tab broadcast channels
    let bcWallet: BroadcastChannel | null = null;
    let bcVero: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bcWallet = new BroadcastChannel("wallet_channel");
        bcWallet.onmessage = handleUpdate;
        bcVero = new BroadcastChannel("vero_channel");
        bcVero.onmessage = handleUpdate;
      }
    } catch {}

    // 4-second heartbeat background poller so admin approvals reflect without refresh
    const interval = setInterval(syncStats, 4000);

    return () => {
      window.removeEventListener("wallet_updated", handleUpdate);
      window.removeEventListener("vero:withdrawal_updated", handleUpdate);
      window.removeEventListener("technical_projects_updated", handleUpdate);
      window.removeEventListener("platform_projects_updated", handleUpdate);
      window.removeEventListener("applied_projects_updated", handleUpdate);
      window.removeEventListener("project_milestones_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      document.removeEventListener("visibilitychange", handleUpdate);

      if (bcWallet) {
        try {
          bcWallet.close();
        } catch {}
      }
      if (bcVero) {
        try {
          bcVero.close();
        } catch {}
      }
      clearInterval(interval);
    };
  }, [syncStats]);

  // Formatter for currency cards
  const formatMoney = (val: number, demoFallback: string) => {
    if (isDemo && !stats.loaded && val === 0) return demoFallback;
    if (val === 0) return "$0";
    return val % 1 === 0
      ? `$${val.toLocaleString()}`
      : `$${val.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
  };

  const statItems = [
    {
      label: u.totalProjects,
      value:
        isDemo && !stats.loaded && stats.totalProjects === 0
          ? String(USER_STATS.totalProjects)
          : String(stats.totalProjects),
    },
    {
      label: u.activeProjects,
      value:
        isDemo && !stats.loaded && stats.activeProjects === 0
          ? String(USER_STATS.activeProjects)
          : String(stats.activeProjects),
    },
    {
      label: u.completedProjects,
      value:
        isDemo && !stats.loaded && stats.completedProjects === 0
          ? String(USER_STATS.completedProjects)
          : String(stats.completedProjects),
    },
    {
      label: u.totalEarnings,
      value: formatMoney(stats.totalEarnings, USER_STATS.totalEarnings),
    },
    {
      label: u.totalWithdrawn,
      value: formatMoney(stats.totalWithdrawn, USER_STATS.totalWithdrawn),
    },
    {
      label: u.currentBalance,
      value: formatMoney(stats.currentBalance, USER_STATS.currentBalance),
      highlight: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className={`rounded-xl border p-3 sm:p-4 shadow-sm transition-all flex flex-col justify-between ${
            stat.highlight
              ? "border-primary bg-primary text-white"
              : "border-gray-100 bg-white"
          }`}
        >
          <p
            className={`mb-1 text-[11px] sm:text-xs font-bold truncate ${
              stat.highlight ? "text-white/80" : "text-primary"
            }`}
          >
            {stat.label}
          </p>
          <h3
            className={`text-base sm:text-lg lg:text-xl font-bold truncate ${
              stat.highlight ? "text-white" : "text-gray-900"
            }`}
            title={stat.value}
          >
            {stat.value}
          </h3>
        </div>
      ))}
    </div>
  );
}

