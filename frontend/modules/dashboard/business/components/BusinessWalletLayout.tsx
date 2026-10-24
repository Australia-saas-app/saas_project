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
import RecordDetailDrawer from "@/src/modules/dashboard/shared/components/RecordDetailDrawer";
import { withdrawDetailFields } from "@/src/modules/dashboard/shared/utils/withdraw-detail";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { getWithdrawalsForUser } from "@/src/shared/lib/wallet-store";
import {
  fetchWalletBalance,
  fetchBusinessTransactions,
  type BusinessTransactionRecord,
} from "@/src/modules/technical/services/technical.services";
import { EMPTY_BUSINESS_STATS } from "@/src/shared/lib/dashboard-empty-stats";
import { BUSINESS_STATS } from "../data/business-demo-data";
import { useUser } from "@/src/context/user.provider";

const PAGE_SIZE = 5;

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
    const onWalletUpdated = () => loadRealBalance();
    window.addEventListener("wallet_updated", onWalletUpdated);
    window.addEventListener("storage", onWalletUpdated);
    window.addEventListener("focus", onWalletUpdated);
    window.addEventListener("platform_projects_updated", onWalletUpdated);
    return () => {
      window.removeEventListener("wallet_updated", onWalletUpdated);
      window.removeEventListener("storage", onWalletUpdated);
      window.removeEventListener("focus", onWalletUpdated);
      window.removeEventListener("platform_projects_updated", onWalletUpdated);
    };
  }, [user]);

  useEffect(() => {
    if (!isReady || !userId) return;
    const stored = getWithdrawalsForUser(userId).map((row) => ({
      id: row.id,
      method: row.method,
      amount: row.amount,
      date: row.date,
      status:
        row.status === "Complete" ? "Complete" : row.status === "Failed" ? "Failed" : "Pending",
    }));
    const demoRows = isDemo ? WITHDRAW_ROWS.slice(0, 40) : [];
    const ids = new Set(stored.map((r) => r.id));
    setWithdrawRows([...stored, ...demoRows.filter((r) => !ids.has(r.id))]);
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
    if (!withdrawSearch.trim()) return withdrawRows;
    const q = withdrawSearch.toLowerCase();
    return withdrawRows.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.amount.toLowerCase().includes(q)
    );
  }, [withdrawSearch, withdrawRows]);

  const filteredEarning = useMemo(() => {
    if (!earningSearch.trim()) return earningRows;
    const q = earningSearch.toLowerCase();
    return earningRows.filter(
      (r: any) =>
        r.id.toLowerCase().includes(q) ||
        r.subcategory.toLowerCase().includes(q) ||
        r.commission.toLowerCase().includes(q)
    );
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
          className="shrink-0 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          {w.withdraw}
        </button>
      </div>

      <WithdrawRequestModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableBalance={stats.currentBalance}
        onSubmit={(result: WithdrawRequestResult) => {
          setWithdrawRows((prev) => [
            {
              id: result.id,
              method: result.method,
              amount: result.amount,
              date: result.date,
              status: "Pending",
            },
            ...prev,
          ]);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
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
                className="w-full sm:w-44 rounded border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:outline-none"
              />
            </div>
          </div>
          {withdrawData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No withdrawals yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[440px]">
                <thead>
                  <tr className="bg-primary text-white uppercase font-bold">
                    <th className="p-2.5 text-left">ID</th>
                    <th className="p-2.5 text-left">{w.method}</th>
                    <th className="p-2.5 text-left">{w.amount}</th>
                    <th className="p-2.5 text-left">{w.status}</th>
                    <th className="p-2.5 text-center">{w.view}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawData.map((row, i) => (
                    <tr key={`${row.id}-${i}`} className="text-gray-700 hover:bg-gray-50">
                      <td className="p-2.5 font-semibold">{row.id}</td>
                      <td className="p-2.5">{row.method}</td>
                      <td className="p-2.5">{row.amount}</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${row.status === "Complete" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWithdraw(row);
                            setDetailOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          title="View withdrawal info"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{w.view}</span>
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

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[360px]">
                <thead>
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
