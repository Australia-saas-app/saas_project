"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import {
  WITHDRAW_ROWS,
  EARNING_ROWS,
  type WithdrawRow,
} from "@/src/modules/dashboard/shared/data/dashboard-demo-data";
import { DashboardTablePagination } from "@/src/modules/dashboard/shared/components/DashboardTablePagination";
import WithdrawRequestModal, {
  type WithdrawRequestResult,
} from "@/src/modules/dashboard/shared/components/WithdrawRequestModal";
import WalletPaymentMethodsCard from "@/src/modules/dashboard/shared/components/WalletPaymentMethodsCard";
import WalletFinancePanel from "@/src/modules/dashboard/shared/components/WalletFinancePanel";
import WithdrawalRevertAction from "@/src/modules/dashboard/shared/components/WithdrawalRevertAction";
import RecordDetailDrawer from "@/src/modules/dashboard/shared/components/RecordDetailDrawer";
import { withdrawDetailFields } from "@/src/modules/dashboard/shared/utils/withdraw-detail";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { getWithdrawalsForUser, fetchWalletWithdrawalsFromDb } from "@/src/shared/lib/wallet-store";
import {
  fetchWalletBalance,
  fetchBusinessTransactions,
  type BusinessTransactionRecord,
} from "@/src/modules/technical/services/technical.services";
import { EMPTY_BUSINESS_STATS } from "@/src/shared/lib/dashboard-empty-stats";
import { BUSINESS_STATS } from "../data/business-demo-data";
import { useUser } from "@/src/context/user.provider";

const PAGE_SIZE = 10;

export default function BusinessWalletLayout() {
  const { t } = useLocale();
  const { user } = useUser();
  const { userId, isDemo, isReady, demoOrEmpty } = useIsDemoAccount();
  const w = t.businessPages.wallet;
  const stats = demoOrEmpty(BUSINESS_STATS, EMPTY_BUSINESS_STATS);
  const [withdrawRows, setWithdrawRows] = useState<WithdrawRow[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawRow | null>(null);
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [earningSearch, setEarningSearch] = useState("");
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [earningPage, setEarningPage] = useState(1);
  const [financialStats, setFinancialStats] = useState({
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    pendingEscrow: 0,
  });

  const loadWithdrawals = async () => {
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
        createdAt: row.createdAt || row.date,
        status: status as any,
        rejectionReason: (row as any).rejectionReason || (row as any).failureReason,
      } as any;
    });
    const demoRows = isDemo ? WITHDRAW_ROWS.slice(0, 40) : [];
    const map = new Map<string, WithdrawRow>();
    for (const r of [...stored, ...demoRows]) {
      if (!map.has(r.id)) map.set(r.id, r);
    }
    setWithdrawRows(Array.from(map.values()));

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
            createdAt: d.createdAt || d.date,
            status: status as any,
            rejectionReason: (d as any).rejectionReason || (d as any).failureReason,
          } as any);
        }
        for (const p of prev) {
          if (!merged.has(p.id)) {
            merged.set(p.id, p);
          } else {
            const current = merged.get(p.id)!;
            merged.set(p.id, { ...p, status: current.status, rejectionReason: current.rejectionReason });
          }
        }
        return Array.from(merged.values());
      });
    }
  };

  const loadRealBalance = async () => {
    try {
      const res = await fetchWalletBalance(user);
      if (res) {
        setFinancialStats(res);
      }
    } catch {}
  };

  useEffect(() => {
    loadRealBalance();
    const onWalletUpdated = () => {
      loadRealBalance();
      loadWithdrawals();
    };
    window.addEventListener("wallet_updated", onWalletUpdated);
    window.addEventListener("vero:withdrawal_updated", onWalletUpdated);
    window.addEventListener("storage", onWalletUpdated);
    window.addEventListener("focus", onWalletUpdated);
    window.addEventListener("platform_projects_updated", onWalletUpdated);

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

    const poller = setInterval(onWalletUpdated, 4000);

    return () => {
      clearInterval(poller);
      window.removeEventListener("wallet_updated", onWalletUpdated);
      window.removeEventListener("vero:withdrawal_updated", onWalletUpdated);
      window.removeEventListener("storage", onWalletUpdated);
      window.removeEventListener("focus", onWalletUpdated);
      window.removeEventListener("platform_projects_updated", onWalletUpdated);
      if (bc1) try { bc1.close(); } catch {}
      if (bc2) try { bc2.close(); } catch {}
    };
  }, [user, userId]);

  useEffect(() => {
    if (!isReady) return;
    loadWithdrawals();
  }, [isReady, userId, isDemo]);

  const realTransactions = useMemo(() => {
    return fetchBusinessTransactions(user).filter(
      (tx: BusinessTransactionRecord) => tx.type === "milestone_release" || tx.type === "project_release" || tx.type === "deposit"
    );
  }, [user, financialStats]);

  const earningRows = useMemo(() => {
    if (realTransactions.length > 0) {
      return realTransactions.map((tx: BusinessTransactionRecord) => ({
        id: tx.id,
        category: "Technical Services",
        subcategory: tx.milestoneInfo || tx.title,
        commission: tx.amount,
        status: (tx.status === "Released" ? "Complete" : tx.status) as any,
      }));
    }
    return demoOrEmpty(EARNING_ROWS, [] as typeof EARNING_ROWS);
  }, [realTransactions, demoOrEmpty]);

  const displayBalance =
    financialStats.balance > 0
      ? `$${financialStats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : stats.currentBalance;

  const displayCommission =
    financialStats.totalEarned > 0
      ? `$${financialStats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : stats.totalCommission;

  const displayPending =
    financialStats.pendingEscrow > 0
      ? `$${financialStats.pendingEscrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : isDemo
      ? "$640"
      : "$0";

  const walletStats = [
    { label: w.totalCommission, value: displayCommission },
    { label: w.totalWithdrawn, value: stats.totalWithdrawn },
    { label: w.pendingPayout, value: displayPending },
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
        (r: any) =>
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
              <table className="w-full text-xs min-w-[620px]">
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
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWithdraw(row);
                              setDetailOpen(true);
                            }}
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
                            onReverted={(id) => {
                              setWithdrawRows((prev) => prev.filter((r) => r.id !== id));
                              loadWithdrawals();
                              loadRealBalance();
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
                  {earningData.map((row: any, i: number) => (
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
            href="/business/transaction"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewTransactions}
          </Link>
          <Link
            href="/business/services"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewServices}
          </Link>
          <Link
            href="/business/profile"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.manageProfile}
          </Link>
        </div>
      </div>

      <RecordDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Withdrawal Details"
        subtitle={selectedWithdraw?.id}
        status={selectedWithdraw?.status}
        fields={selectedWithdraw ? withdrawDetailFields(selectedWithdraw) : []}
      />
    </div>
  );
}
