"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { getWithdrawalsForUser } from "@/src/shared/lib/wallet-store";
import { fetchWalletBalance } from "@/src/modules/technical/services/technical.services";
import { USER_STATS } from "../data/user-demo-data";

const PAGE_SIZE = 5;

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
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [earningSearch, setEarningSearch] = useState("");
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [earningPage, setEarningPage] = useState(1);

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
    const demoRows = isDemo ? [...WITHDRAW_ROWS] : [];
    const ids = new Set(stored.map((r) => r.id));
    setWithdrawRows([...stored, ...demoRows.filter((r) => !ids.has(r.id))]);
  }, [isReady, userId, isDemo]);

  const earningRows = demoOrEmpty(EARNING_ROWS, [] as typeof EARNING_ROWS);

  const [realBalance, setRealBalance] = useState<number | null>(null);

  const loadRealBalance = async () => {
    try {
      const res = await fetchWalletBalance();
      if (res?.balance !== undefined && res.balance !== null) {
        setRealBalance(res.balance);
      }
    } catch {}
  };

  useEffect(() => {
    loadRealBalance();
    const onWalletUpdated = () => loadRealBalance();
    window.addEventListener("wallet_updated", onWalletUpdated);
    return () => window.removeEventListener("wallet_updated", onWalletUpdated);
  }, []);

  const displayBalance = realBalance !== null ? `$${realBalance.toFixed(2)}` : stats.currentBalance;

  const walletStats = [
    { label: w.totalEarnings, value: stats.totalEarnings },
    { label: w.totalWithdrawn, value: stats.totalWithdrawn },
    { label: w.pendingPayout, value: isDemo ? "$12" : "$0" },
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
      (r) =>
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
          className="shrink-0 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
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
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="bg-primary text-white uppercase font-bold">
                    <th className="p-2.5 text-left">ID</th>
                    <th className="p-2.5 text-left">{w.method}</th>
                    <th className="p-2.5 text-left">{w.amount}</th>
                    <th className="p-2.5 text-left">{w.status}</th>
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
