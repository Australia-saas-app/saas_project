"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/src/components/ui/card";
import { Table, TableHeading, TableBody, TableRow, TableColumn } from "@/src/components/table";
import TabButton from "@/src/components/ui/TabButton";
import { Button } from "@/src/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { Pagination } from "@/src/components/ui/pagination";
import { SearchInput } from "@/src/components/form/search-input";
import RecordDetailDrawer from "./RecordDetailDrawer";
import { useUser } from "@/src/context/user.provider";
import {
  fetchWalletBalance,
  fetchBusinessTransactions,
  type BusinessTransactionRecord,
} from "@/src/modules/technical/services/technical.services";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

export default function TechnicalPaymentLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();

  const [walletStats, setWalletStats] = useState({
    balance: 0,
    totalEarned: 0,
    totalWithdrawn: 0,
    pendingEscrow: 0,
  });
  const [transactions, setTransactions] = useState<BusinessTransactionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<BusinessTransactionRecord | null>(null);
  const PAGE_SIZE = 10;

  const loadData = async () => {
    try {
      const balanceRes = await fetchWalletBalance(user);
      setWalletStats(balanceRes);
      const txs = fetchBusinessTransactions(user);
      setTransactions(txs);
    } catch {}
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("wallet_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    window.addEventListener("platform_projects_updated", handleUpdate);
    window.addEventListener("applied_projects_updated", handleUpdate);

    return () => {
      window.removeEventListener("wallet_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("platform_projects_updated", handleUpdate);
      window.removeEventListener("applied_projects_updated", handleUpdate);
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (p) =>
        p.id.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.method.toLowerCase().includes(q) ||
        p.amount.toLowerCase().includes(q) ||
        p.date.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q) ||
        (p.clientName && p.clientName.toLowerCase().includes(q))
    );
  }, [search, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToProject = () => {
    if (pathname?.endsWith("/payment")) {
      router.push(pathname.replace(/\/payment$/, ""));
    } else {
      router.push("/business/technical");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Financial Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Available Balance */}
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Available Balance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-extrabold text-foreground">
            ${walletStats.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Ready for withdrawal &amp; payout
          </p>
        </div>

        {/* Total Released Revenue */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Released Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ${walletStats.totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Net milestone &amp; service earnings
          </p>
        </div>

        {/* Pending in Escrow */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Pending in Escrow
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            ${walletStats.pendingEscrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Funded, awaiting milestone delivery
          </p>
        </div>

        {/* Completed Payouts Count */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Completed Payouts
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <h3 className="mt-2 text-2xl font-extrabold text-foreground">
            {transactions.length}
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Released milestone &amp; project transactions
          </p>
        </div>
      </div>

      {/* Main Transactions Card */}
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border p-5">
          <div className="flex items-center gap-2">
            <TabButton label="Project" isActive={false} onClick={goToProject} />
            <TabButton label="Payment &amp; Revenue" isActive onClick={() => {}} />
          </div>
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={(v) => setSearch(v)}
              placeholder="Search payment records..."
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <Table>
                <TableHeading>
                  <TableColumn isHeader>Transaction ID</TableColumn>
                  <TableColumn isHeader>Service / Milestone</TableColumn>
                  <TableColumn isHeader>Payout Type</TableColumn>
                  <TableColumn isHeader>Released Amount</TableColumn>
                  <TableColumn isHeader>Date &amp; Time</TableColumn>
                  <TableColumn isHeader>Status</TableColumn>
                  <TableColumn isHeader>Action</TableColumn>
                </TableHeading>

                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableColumn>
                        <div className="py-12 text-center text-muted-foreground">
                          <DollarSign className="mx-auto h-10 w-10 opacity-30 mb-2" />
                          <p className="text-sm font-semibold text-foreground">
                            No payment records yet
                          </p>
                          <p className="text-xs mt-1 max-w-sm mx-auto">
                            When clients accept your project deliverables or milestones, escrow payouts are released automatically and appear here.
                          </p>
                        </div>
                      </TableColumn>
                    </TableRow>
                  ) : (
                    pageData.map((t) => (
                      <TableRow key={t.id} className="hover:bg-muted/40 transition-colors">
                        <TableColumn>
                          <span className="font-mono text-xs font-bold text-primary">
                            {t.id}
                          </span>
                        </TableColumn>
                        <TableColumn>
                          <div className="min-w-0 max-w-xs">
                            <p className="font-bold text-xs text-foreground truncate">
                              {t.title}
                            </p>
                            {t.clientName && (
                              <p className="text-[11px] text-muted-foreground">
                                Client: {t.clientName}
                              </p>
                            )}
                          </div>
                        </TableColumn>
                        <TableColumn>
                          <span className="text-xs text-muted-foreground font-medium">
                            {t.method}
                          </span>
                        </TableColumn>
                        <TableColumn>
                          <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            {t.amount}
                          </span>
                        </TableColumn>
                        <TableColumn>
                          <span className="text-xs text-muted-foreground">
                            {t.date}
                          </span>
                        </TableColumn>
                        <TableColumn>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              t.status === "Released" || t.status === "Completed"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : t.status === "Pending"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {t.status}
                          </span>
                        </TableColumn>
                        <TableColumn>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(t);
                              setDetailOpen(true);
                            }}
                            className="rounded-xl text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            View
                          </Button>
                        </TableColumn>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-border">
            <div className="text-xs text-muted-foreground font-medium">
              Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} Results
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={PAGE_SIZE}
              totalResults={filtered.length}
              onPageChange={(p: number) => setPage(p)}
            />
          </div>
        </CardContent>
      </Card>

      <RecordDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Payout &amp; Payment Details"
        fields={
          selectedPayment
            ? [
                { label: "Transaction ID", value: selectedPayment.id },
                { label: "Project Title", value: selectedPayment.title },
                { label: "Payout Method", value: selectedPayment.method },
                { label: "Released Amount", value: selectedPayment.amount },
                { label: "Client", value: selectedPayment.clientName || "Client" },
                { label: "Release Date", value: selectedPayment.date },
                { label: "Status", value: selectedPayment.status },
                { label: "Milestone Details", value: selectedPayment.milestoneInfo || "Full Milestone Release" },
              ]
            : []
        }
      />
    </div>
  );
}
