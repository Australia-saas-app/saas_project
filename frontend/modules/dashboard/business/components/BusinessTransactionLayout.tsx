"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowLeftRight, Search } from "lucide-react";
import { toast } from "sonner";
import { exportToCSV } from "@/src/utils/export";
import {
  BUSINESS_TRANSACTION_ROWS,
  type BusinessTransactionRow,
  type TransactionType,
} from "../data/business-demo-data";
import { DashboardTablePagination } from "../../shared/components/DashboardTablePagination";
import RecordDetailDrawer from "../../shared/components/RecordDetailDrawer";
import { sortByMoney } from "../../shared/utils/sort-rows";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { fetchWalletBalance } from "@/src/modules/technical/services/technical.services";

const PAGE_SIZE = 8;
const TABS = ["all", "deposits", "withdrawals", "invoices"] as const;
type TabKey = (typeof TABS)[number];

function matchesTab(row: BusinessTransactionRow, tab: TabKey) {
  if (tab === "all") return true;
  if (tab === "deposits") return row.type === "Deposit";
  if (tab === "withdrawals") return row.type === "Withdrawal";
  return row.type === "Invoice";
}

function renderStatus(status: BusinessTransactionRow["status"]) {
  const styles = {
    Complete: "bg-green-100 text-green-700",
    Pending: "bg-amber-100 text-amber-700",
    Failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>{status}</span>
  );
}

function renderType(type: TransactionType) {
  const styles: Record<TransactionType, string> = {
    Deposit: "text-green-700",
    Withdrawal: "text-red-600",
    Invoice: "text-primary",
    Commission: "text-blue-700",
  };
  return <span className={`text-[11px] font-bold ${styles[type]}`}>{type}</span>;
}

export default function BusinessTransactionLayout() {
  const { t } = useLocale();
  const { demoOrEmpty, isDemo } = useIsDemoAccount();
  const transactions = demoOrEmpty(
    BUSINESS_TRANSACTION_ROWS,
    [] as typeof BUSINESS_TRANSACTION_ROWS
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<BusinessTransactionRow | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"Up" | "Down">("Down");
  const [page, setPage] = useState(1);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = transactions.filter((row) => {
      if (!matchesTab(row, activeTab)) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.type.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q) ||
        row.amount.toLowerCase().includes(q) ||
        row.method.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
    return sortByMoney(rows, (r) => r.amount.replace(/^\+/, ""), sortDir);
  }, [activeTab, search, sortDir, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const displayBalance = realBalance !== null ? `$${realBalance.toFixed(2)}` : (isDemo ? "$2,920" : "$0.00");

  const transactionStats = [
    { label: t.business.transactions.totalInflow, value: "$12,480" },
    { label: t.business.transactions.totalOutflow, value: "$8,920" },
    { label: t.business.transactions.pending, value: "$640" },
    { label: t.business.transactions.availableBalance, value: displayBalance, highlight: true },
  ];

  const tabLabels: Record<TabKey, string> = {
    all: t.business.transactions.all,
    deposits: t.business.transactions.deposits,
    withdrawals: t.business.transactions.withdrawals,
    invoices: t.business.transactions.invoices,
  };

  function handleExportReport() {
    if (!filtered.length) {
      toast.error("No transactions to export for the current filters.");
      return;
    }

    const rows = filtered.map((row) => ({
      "Transaction ID": row.id,
      Type: row.type,
      Description: row.description,
      Amount: row.amount,
      Method: row.method,
      "Date & Time": row.date,
      Status: row.status,
    }));

    const tabSlug = activeTab === "all" ? "all" : activeTab;
    const date = new Date().toISOString().slice(0, 10);
    exportToCSV(rows, `business-transactions-${tabSlug}-${date}`, [
      "Transaction ID",
      "Type",
      "Description",
      "Amount",
      "Method",
      "Date & Time",
      "Status",
    ]);
    toast.success(
      `Exported ${filtered.length} transaction${filtered.length === 1 ? "" : "s"} to CSV.`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Business</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t.business.transactions.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.business.transactions.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportReport}
            className="shrink-0 rounded border border-gray-200 bg-white px-5 py-2 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            {t.business.transactions.exportReport}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {transactionStats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded border p-4 shadow-sm ${
              "highlight" in stat
                ? "border-primary bg-primary text-white"
                : "border-gray-100 bg-white"
            }`}
          >
            <p
              className={`mb-1 text-xs font-bold ${
                "highlight" in stat ? "text-white/80" : "text-primary"
              }`}
            >
              {stat.label}
            </p>
            <h3
              className={`text-xl font-bold ${
                "highlight" in stat ? "text-white" : "text-gray-900"
              }`}
            >
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                  }}
                  className={`rounded px-4 py-2 text-xs font-bold transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.business.transactions.searchPlaceholder}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded border border-gray-200 bg-white py-1.5 pr-3 pl-8 text-xs focus:outline-none sm:w-52"
                />
              </div>
              <button
                type="button"
                onClick={() => setSortDir(sortDir === "Up" ? "Down" : "Up")}
                className="flex items-center gap-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600"
              >
                {sortDir}
                {sortDir === "Up" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-primary font-bold text-white uppercase">
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Date &amp; Time</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  pageData.map((row) => (
                    <tr key={row.id} className="text-gray-700 hover:bg-gray-50">
                      <td className="p-3 font-semibold">{row.id}</td>
                      <td className="p-3">{renderType(row.type)}</td>
                      <td className="max-w-[180px] truncate p-3 text-gray-500">
                        {row.description}
                      </td>
                      <td
                        className={`p-3 font-bold ${
                          row.amount.startsWith("+") ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {row.amount}
                      </td>
                      <td className="p-3">{row.method}</td>
                      <td className="p-3 text-gray-500">{row.date}</td>
                      <td className="p-3">{renderStatus(row.status)}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTx(row);
                            setDetailOpen(true);
                          }}
                          className="rounded bg-primary px-3 py-1 text-[10px] font-bold text-white hover:bg-primary/90"
                        >
                          VIEW
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <DashboardTablePagination
            current={page}
            total={totalPages}
            pageSize={PAGE_SIZE}
            totalItems={filtered.length}
            onChange={setPage}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              {t.business.transactions.thisMonth}
            </h3>
            <div className="space-y-3">
              {[
                { label: "Deposits", value: "$3,240", tone: "text-green-700" },
                { label: "Withdrawals", value: "$1,890", tone: "text-red-600" },
                { label: "Invoices Paid", value: "$2,105", tone: "text-primary" },
                { label: "Commissions", value: "$485", tone: "text-blue-700" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className={`text-sm font-bold ${item.tone}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              {t.business.transactions.quickActions}
            </h3>
            <div className="flex flex-col gap-2">
              {[
                {
                  label: "Download Statement",
                  action: () => handleExportReport(),
                },
                {
                  label: "Add Payment Method",
                  action: () => toast.success("Payment method form opened."),
                },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="rounded border border-gray-200 px-4 py-2.5 text-left text-xs font-bold text-gray-700 transition-colors hover:border-primary/30 hover:bg-gray-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RecordDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedTx?.description ?? "Transaction"}
        subtitle={selectedTx?.id}
        status={selectedTx?.status}
        fields={
          selectedTx
            ? [
                { label: "Type", value: selectedTx.type },
                { label: "Amount", value: selectedTx.amount },
                { label: "Method", value: selectedTx.method },
                { label: "Date", value: selectedTx.date },
                { label: "Status", value: selectedTx.status },
              ]
            : []
        }
      />
    </div>
  );
}
