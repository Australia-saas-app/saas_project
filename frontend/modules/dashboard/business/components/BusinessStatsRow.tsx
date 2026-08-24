"use client";

import React, { useEffect, useState } from "react";
import { useLocale } from "@/src/shared/context/locale.provider";
import { BUSINESS_STATS } from "../data/business-demo-data";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { EMPTY_BUSINESS_STATS } from "@/src/shared/lib/dashboard-empty-stats";
import { fetchWalletBalance } from "@/src/modules/technical/services/technical.services";

export function BusinessStatsRow() {
  const { t } = useLocale();
  const { demoOrEmpty, isDemo } = useIsDemoAccount();
  const d = t.business.dashboard;
  const stats = demoOrEmpty(BUSINESS_STATS, EMPTY_BUSINESS_STATS);
  const [realBalance, setRealBalance] = useState<number | null>(null);

  const loadBalance = async () => {
    try {
      const res = await fetchWalletBalance();
      if (res?.balance !== undefined && res.balance !== null) {
        setRealBalance(res.balance);
      }
    } catch {}
  };

  useEffect(() => {
    loadBalance();
    const onWalletUpdated = () => loadBalance();
    window.addEventListener("wallet_updated", onWalletUpdated);
    return () => window.removeEventListener("wallet_updated", onWalletUpdated);
  }, []);

  const displayBalance = realBalance !== null ? `$${realBalance.toFixed(2)}` : (isDemo ? stats.currentBalance : "$0.00");

  const items = [
    { label: d.totalProject, value: String(stats.totalProjects) },
    { label: d.pendingProject, value: String(stats.pendingProjects) },
    { label: d.successfulProjects, value: String(stats.successfulProjects) },
    { label: d.totalCommission, value: stats.totalCommission },
    { label: d.totalWithdrawn, value: stats.totalWithdrawn },
    { label: d.currentBalance, value: displayBalance, highlight: true },
  ];

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      {items.map((stat) => (
        <div
          key={stat.label}
          className={`min-w-[130px] flex-1 rounded-xl border p-4 shadow-sm ${
            stat.highlight ? "border-primary bg-primary text-white" : "border-gray-100 bg-white"
          }`}
        >
          <p
            className={`mb-1 text-xs font-bold ${stat.highlight ? "text-white/80" : "text-primary"}`}
          >
            {stat.label}
          </p>
          <h3 className={`text-xl font-bold ${stat.highlight ? "text-white" : "text-gray-900"}`}>
            {stat.value}
          </h3>
        </div>
      ))}
    </div>
  );
}
