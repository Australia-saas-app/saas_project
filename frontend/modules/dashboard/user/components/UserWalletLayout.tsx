"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Loader2, Eye } from "lucide-react";
import {
  WITHDRAW_ROWS,
  EARNING_ROWS,
  type WithdrawRow,
} from "@/src/modules/dashboard/shared/data/dashboard-demo-data";
import { DashboardTablePagination } from "@/src/modules/dashboard/shared/components/DashboardTablePagination";
import WithdrawRequestModal, {
  type WithdrawRequestResult,
} from "@/src/modules/dashboard/shared/components/WithdrawRequestModal";
import WithdrawalDetailsModal from "@/src/modules/dashboard/shared/components/WithdrawalDetailsModal";
import WalletPaymentMethodsCard from "@/src/modules/dashboard/shared/components/WalletPaymentMethodsCard";
import WalletFinancePanel from "@/src/modules/dashboard/shared/components/WalletFinancePanel";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { getWithdrawalsForUser, fetchWalletWithdrawalsFromDb } from "@/src/shared/lib/wallet-store";
import { fetchWalletBalance } from "@/src/modules/technical/services/technical.services";
import { USER_STATS } from "../data/user-demo-data";

const PAGE_SIZE = 10;

const EMPTY_STATS = {
  totalEarnings: "$0",
  totalWithdrawn: "$0",
  currentBalance: "$0",
};

export default function UserWalletLayout() {
  const { t } = useLocale();
  const { userId, isDemo, isReady, demoOrEmpty } = useIsDemoAccount();
  const w = t.userPages.wallet;
  const stats = demoOrEmpty(USER_STATS, { ...USER_STATS, ...EMPTY_STATS });
  const [withdrawRows, setWithdrawRows] = useState<WithdrawRow[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawRow | null>(null);
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [earningSearch, setEarningSearch] = useState("");
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [earningPage, setEarningPage] = useState(1);

  const loadWithdrawals = async () => {
    // 1. Instant local render
    const stored = getWithdrawalsForUser(userId).map((row) => {
      const s = String(row.status || "").toLowerCase();
      const status: "Approved" | "Rejected" | "Pending" =
        s === "approved" || s === "complete" || s === "paid"
          ? "Approved"
          : s === "rejected" || s === "failed"
          ? "Rejected"
          : "Pending";
      return {
        id: row.id,
        method: row.method,
        amount: row.amount,
        date: row.date,
        status: status as any,
      };
    });
    const demoRows = isDemo ? [...WITHDRAW_ROWS] : [];
    const map = new Map<string, WithdrawRow>();
    for (const r of [...stored, ...demoRows]) {
      if (!map.has(r.id)) map.set(r.id, r);
    }
    setWithdrawRows(Array.from(map.values()));

    // 2. Fresh sync from database
    const dbRows = await fetchWalletWithdrawalsFromDb();
    if (dbRows.length > 0) {
      setWithdrawRows((prev) => {
        const merged = new Map<string, WithdrawRow>();
        for (const d of dbRows) {
          const s = String(d.status || "").toLowerCase();
          const status =
            s === "approved" || s === "complete" || s === "paid"
              ? "Approved"
              : s === "rejected" || s === "failed"
              ? "Rejected"
              : "Pending";
          merged.set(d.id, {
            id: d.id,
            method: d.method,
            amount: d.amount,
            date: d.date,
            status: status as any,
          });
        }
        for (const p of prev) {
          if (!merged.has(p.id)) {
            merged.set(p.id, p);
          } else {
            const current = merged.get(p.id)!;
            merged.set(p.id, { ...p, status: current.status });
          }
        }
        return Array.from(merged.values());
      });
    }
  };

  useEffect(() => {
    if (!isReady) return;
    loadWithdrawals();
  }, [isReady, userId, isDemo]);

  const earningRows = demoOrEmpty(EARNING_ROWS, [] as typeof EARNING_ROWS);

  const [loadingBalance, setLoadingBalance] = useState(true);
  const [realBalance, setRealBalance] = useState<number | null>(null);

  const loadRealBalance = async () => {
    try {
      const res = await fetchWalletBalance();
      if (res?.balance !== undefined && res.balance !== null) {
        setRealBalance(res.balance);
      }
    } catch {
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    loadRealBalance();
    const onWalletUpdated = () => {
      loadRealBalance();
      loadWithdrawals();
    };
    window.addEventListener("wallet_updated", onWalletUpdated);
    window.addEventListener("vero:withdrawal_updated", onWalletUpdated);

    let bc1: BroadcastChannel | null = null;
    let bc2: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc1 = new BroadcastChannel("wallet_channel");
        bc1.onmessage = () => {
          loadRealBalance();
          loadWithdrawals();
        };
        bc2 = new BroadcastChannel("vero_channel");
        bc2.onmessage = () => {
          loadRealBalance();
          loadWithdrawals();
        };
      }
    } catch {}

    return () => {
      window.removeEventListener("wallet_updated", onWalletUpdated);
      window.removeEventListener("vero:withdrawal_updated", onWalletUpdated);
      if (bc1) try { bc1.close(); } catch {}
      if (bc2) try { bc2.close(); } catch {}
    };
  }, [userId]);

  const displayBalance = realBalance !== null ? `$${realBalance.toFixed(2)}` : stats.currentBalance;

  const walletStats = [
    { label: w.totalEarnings, value: stats.totalEarnings },
    { label: w.totalWithdrawn, value: stats.totalWithdrawn },
    { label: w.pendingPayout, value: isDemo ? "$12" : "$0" },
    { label: w.availableBalance, value: displayBalance, highlight: true },
  ];

  const filteredWithdraw = useMemo(() => {
    const uniqueMap = new Map<string, WithdrawRow>();
    for (const r of withdrawRows) {
      if (!uniqueMap.has(r.id)) {
        uniqueMap.set(r.id, r);
      }
    }
    let rows = Array.from(uniqueMap.values());
    if (withdrawSearch.trim()) {
      const q = withdrawSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.method.toLowerCase().includes(q) ||
          r.amount.toLowerCase().includes(q)
      );
    }
    return rows.sort((a, b) => {
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
        return tB - tA;
      }
      return 0;
    });
  }, [withdrawSearch, withdrawRows]);

  const filteredEarning = useMemo(() => {
    let rows = earningRows;
    if (earningSearch.trim()) {
      const q = earningSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.subcategory.toLowerCase().includes(q) ||
          r.commission.toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a: any, b: any) => {
      const tA = a.date ? new Date(a.date).getTime() : NaN;
      const tB = b.date ? new Date(b.date).getTime() : NaN;
      if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
        return tB - tA;
      }
      return 0;
    });
  }, [earningSearch, earningRows]);

  const withdrawPages = Math.max(1, Math.ceil(filteredWithdraw.length / PAGE_SIZE));
  const earningPages = Math.max(1, Math.ceil(filteredEarning.length / PAGE_SIZE));
  const withdrawData = filteredWithdraw.slice(
    (withdrawPage - 1) * PAGE_SIZE,
    withdrawPage * PAGE_SIZE
  );
  const earningData = filteredEarning.slice((earningPage - 1) * PAGE_SIZE, earningPage * PAGE_SIZE);

  if (loadingBalance || !isReady) {
    return (
      <div className="flex min-h-[450px] w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-[3px] border-primary/20" />
          <div className="absolute h-12 w-12 rounded-full border-[3px] border-transparent border-t-primary border-r-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{w.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{w.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          className="shrink-0 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
        >
          {w.withdraw}
        </button>
      </div>

      <WithdrawRequestModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={displayBalance}
        onSubmit={(result: WithdrawRequestResult) => {
          setWithdrawRows((prev) => {
            if (prev.some((r) => r.id === result.id)) return prev;
            return [
              {
                id: result.id,
                method: result.method,
                amount: result.amount,
                date: result.date,
                status: "Pending",
              },
              ...prev,
            ];
          });
        }}
      />

      <WalletFinancePanel />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {walletStats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-4 md:p-5 shadow-sm border ${
              stat.highlight ? "bg-primary text-white border-primary" : "bg-white border-gray-100"
            }`}
          >
            <p
              className={`text-xs font-semibold mb-1 ${stat.highlight ? "text-white/80" : "text-gray-500"}`}
            >
              {stat.label}
            </p>
            <p
              className={`text-lg md:text-xl font-bold ${stat.highlight ? "text-white" : "text-gray-900"}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <WalletPaymentMethodsCard />

      <div className="space-y-6">
        <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-gray-900">{w.withdrawHistory}</h2>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={w.search}
                value={withdrawSearch}
                onChange={(e) => {
                  setWithdrawSearch(e.target.value);
                  setWithdrawPage(1);
                }}
                className="w-full sm:w-36 rounded border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:outline-none"
              />
            </div>
          </div>
          {withdrawData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No withdrawals yet.</p>
          ) : (
            <div className="max-h-[195px] overflow-y-auto overflow-x-auto rounded border border-gray-100">
              <table className="w-full text-xs min-w-[540px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-primary text-white uppercase font-bold text-[11px]">
                    <th className="p-3 text-left">Transaction ID</th>
                    <th className="p-3 text-left">{w.method}</th>
                    <th className="p-3 text-left">{w.amount}</th>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">{w.status}</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawData.map((row, i) => (
                    <tr key={`${row.id}-${i}`} className="text-gray-700 hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-mono font-semibold text-gray-900 text-xs">{row.id}</td>
                      <td className="p-3 text-gray-700">{row.method}</td>
                      <td className="p-3 font-semibold text-gray-900">{row.amount}</td>
                      <td className="p-3 text-gray-500 whitespace-nowrap">{row.date}</td>
                      <td className="p-3">
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
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedWithdrawal(row)}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="View withdrawal info"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
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

        <WithdrawalDetailsModal
          open={Boolean(selectedWithdrawal)}
          onClose={() => setSelectedWithdrawal(null)}
          withdrawal={selectedWithdrawal}
        />

        <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-bold text-gray-900">{w.earningHistory}</h2>
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={w.search}
                value={earningSearch}
                onChange={(e) => {
                  setEarningSearch(e.target.value);
                  setEarningPage(1);
                }}
                className="w-full sm:w-36 rounded border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:outline-none"
              />
            </div>
          </div>
          {earningData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No earnings recorded yet.</p>
          ) : (
            <div className="max-h-[195px] overflow-y-auto overflow-x-auto rounded border border-gray-100">
              <table className="w-full text-xs min-w-[360px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-primary text-white uppercase font-bold">
                    <th className="p-2.5 text-left">ID</th>
                    <th className="p-2.5 text-left">{w.category}</th>
                    <th className="p-2.5 text-left">{w.commission}</th>
                    <th className="p-2.5 text-left">{w.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {earningData.map((row, i) => (
                    <tr key={`${row.id}-${i}`} className="text-gray-700 hover:bg-gray-50">
                      <td className="p-2.5 font-semibold">{row.id}</td>
                      <td className="p-2.5 text-gray-500">{row.subcategory}</td>
                      <td className="p-2.5 font-medium">{row.commission}</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${row.status === "Complete" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
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
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">{w.quickActions}</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/user/earnings"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewEarnings}
          </Link>
          <Link
            href="/user/orders"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewOrders}
          </Link>
          <Link
            href="/user/profile"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.manageProfile}
          </Link>
        </div>
      </div>
    </div>
  );
}
