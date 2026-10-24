"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import { useLocale } from "@/src/shared/context/locale.provider";
import { DashboardTablePagination } from "@/src/modules/dashboard/shared/components/DashboardTablePagination";
import {
  WITHDRAW_ROWS,
  EARNING_ROWS,
  type WithdrawRow,
} from "@/src/modules/dashboard/shared/data/dashboard-demo-data";
import WithdrawRequestModal, {
  type WithdrawRequestResult,
} from "@/src/modules/dashboard/shared/components/WithdrawRequestModal";
import WithdrawalDetailsModal from "@/src/modules/dashboard/shared/components/WithdrawalDetailsModal";
import WalletPaymentMethodsCard from "@/src/modules/dashboard/shared/components/WalletPaymentMethodsCard";
import WalletFinancePanel from "@/src/modules/dashboard/shared/components/WalletFinancePanel";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { getWithdrawalsForUser } from "@/src/shared/lib/wallet-store";
import { fetchWalletBalance } from "@/src/modules/technical/services/technical.services";
import { EMPTY_AFFILIATE_STATS } from "@/src/shared/lib/dashboard-empty-stats";
import { AFFILIATE_STATS, AFFILIATE_LEVELS } from "../data/affiliate-demo-data";

const PAGE_SIZE = 5;

export default function AffiliateWalletLayout() {
  const { t } = useLocale();
  const { userId, isDemo, isReady, demoOrEmpty } = useIsDemoAccount();
  const w = t.affiliatePages.wallet;
  const stats = demoOrEmpty(AFFILIATE_STATS, EMPTY_AFFILIATE_STATS);
  const [withdrawRows, setWithdrawRows] = useState<WithdrawRow[]>([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawRow | null>(null);
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [earningSearch, setEarningSearch] = useState("");
  const [withdrawPage, setWithdrawPage] = useState(1);
  const [earningPage, setEarningPage] = useState(1);
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
    const demoRows = isDemo ? WITHDRAW_ROWS.slice(0, 20) : [];
    const ids = new Set(stored.map((r) => r.id));
    setWithdrawRows([...stored, ...demoRows.filter((r) => !ids.has(r.id))]);
  }, [isReady, userId, isDemo]);

  const earningRows = demoOrEmpty(EARNING_ROWS.slice(0, 20), [] as typeof EARNING_ROWS);

  const displayBalance = realBalance !== null ? `$${realBalance.toFixed(2)}` : stats.currentBalance;

  const walletStats = [
    { label: w.totalCommission, value: stats.totalCommission },
    { label: w.totalWithdrawn, value: stats.totalWithdrawn },
    { label: w.pendingPayout, value: stats.pendingPayout },
    { label: w.availableBalance, value: displayBalance, highlight: true },
  ];

  const filteredWithdraw = useMemo(() => {
    if (!withdrawSearch.trim()) return withdrawRows;
    const q = withdrawSearch.toLowerCase();
    return withdrawRows.filter(
      (r) => r.id.toLowerCase().includes(q) || r.method.toLowerCase().includes(q)
    );
  }, [withdrawSearch, withdrawRows]);

  const filteredEarning = useMemo(() => {
    if (!earningSearch.trim()) return earningRows;
    const q = earningSearch.toLowerCase();
    return earningRows.filter(
      (r) => r.id.toLowerCase().includes(q) || r.subcategory.toLowerCase().includes(q)
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
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{w.title}</h1>
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
            className={`rounded-xl p-4 md:p-5 shadow-sm border ${stat.highlight ? "bg-primary text-white border-primary" : "bg-white border-gray-100"}`}
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

      {isDemo && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <h2 className="text-base font-bold text-gray-900">{t.affiliate.rankLevel}</h2>
            <div className="flex items-center gap-4 text-xs font-semibold text-primary">
              <span>{t.affiliate.commissionRate}</span>
              <span>{t.affiliate.rank}</span>
            </div>
          </div>
          <div className="relative pt-2 pb-8">
            <div
              className="absolute -top-1 bg-[#0091ff] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm"
              style={{ left: `${stats.levelProgress}%`, transform: "translateX(-50%)" }}
            >
              {stats.levelProgress}%
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-[#0091ff] h-3 rounded-full"
                style={{ width: `${stats.levelProgress}%` }}
              />
            </div>
            <div className="relative flex justify-between mt-3 px-1">
              {AFFILIATE_LEVELS.map((level, idx) => (
                <div key={level} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${idx < stats.currentLevel ? "bg-[#0091ff]" : "bg-gray-300"}`}
                  />
                  <span className="text-[9px] md:text-[10px] text-gray-500 font-medium text-center max-w-[48px] leading-tight hidden sm:block">
                    {level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-6">
        <div className="xl:col-span-2 rounded-xl border border-gray-100 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-gray-900">{w.withdrawHistory}</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={w.search}
                value={withdrawSearch}
                onChange={(e) => {
                  setWithdrawSearch(e.target.value);
                  setWithdrawPage(1);
                }}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-full sm:w-44 focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead>
                <tr className="bg-primary text-white font-bold uppercase">
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">{w.method}</th>
                  <th className="p-3">{w.amount}</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">{w.status}</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500">
                      No withdrawals yet.
                    </td>
                  </tr>
                ) : (
                  withdrawData.map((item, i) => (
                    <tr key={`${item.id}-${i}`} className="hover:bg-gray-50 text-gray-700">
                      <td className="p-3 font-semibold">{item.id}</td>
                      <td className="p-3">{item.method}</td>
                      <td className="p-3">{item.amount}</td>
                      <td className="p-3 text-gray-500">{item.date}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${item.status === "Complete" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedWithdrawal(item)}
                          className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          title="View withdrawal info"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

        <div className="rounded-xl border border-gray-100 bg-white p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-base font-bold text-gray-900">{w.earningHistory}</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={w.search}
                value={earningSearch}
                onChange={(e) => {
                  setEarningSearch(e.target.value);
                  setEarningPage(1);
                }}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs w-full sm:w-32 focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[280px]">
              <thead>
                <tr className="bg-primary text-white font-bold uppercase">
                  <th className="p-3">ID</th>
                  <th className="p-3">{w.category}</th>
                  <th className="p-3">{w.commission}</th>
                  <th className="p-3">{w.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earningData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">
                      No earnings yet.
                    </td>
                  </tr>
                ) : (
                  earningData.map((item, i) => (
                    <tr key={`${item.id}-${i}`} className="hover:bg-gray-50 text-gray-700">
                      <td className="p-3 font-semibold">{item.id}</td>
                      <td className="p-3 text-gray-500">{item.subcategory}</td>
                      <td className="p-3 font-medium">{item.commission}</td>
                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] ${item.status === "Complete" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
            href="/affiliate/earnings"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewEarnings}
          </Link>
          <Link
            href="/affiliate/referrals"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewReferrals}
          </Link>
          <Link
            href="/affiliate/promotions"
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {w.viewPromotions}
          </Link>
        </div>
      </div>
    </div>
  );
}
