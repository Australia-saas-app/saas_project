"use client";

import { useEffect, useState } from "react";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import axiosInstance from "@/src/shared/lib/axiosInstance";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, DollarSign, Loader2, RefreshCw } from "lucide-react";

interface PenaltyItem {
  id: string;
  penaltyId?: string;
  reason: string;
  amount: string | number;
  currency?: string;
  date: string;
  status: "Active" | "Resolved" | string;
  paidAt?: string;
}

const DEMO_PENALTY_RECORDS: PenaltyItem[] = [
  { id: "PEN-001", penaltyId: "PEN-001", reason: "Late project delivery", amount: 25, currency: "USD", date: "2025/06/12", status: "Resolved" },
  { id: "PEN-002", penaltyId: "PEN-002", reason: "Policy violation — spam listing", amount: 50, currency: "USD", date: "2025/05/03", status: "Active" },
];

export default function PenaltyLayout() {
  const { isDemo } = useIsDemoAccount();
  const [penalties, setPenalties] = useState<PenaltyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchPenalties = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/payment/penalties/my");
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        setPenalties(
          list.map((p: any) => ({
            id: p.id,
            penaltyId: p.penaltyId || p.id,
            reason: p.reason || "Policy violation",
            amount: Number(p.amount),
            currency: p.currency || "USD",
            date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            status: p.status === "ACTIVE" || p.status === "Active" ? "Active" : "Resolved",
            paidAt: p.paidAt,
          }))
        );
      } else if (isDemo) {
        setPenalties(DEMO_PENALTY_RECORDS);
      } else {
        setPenalties([]);
      }
    } catch {
      if (isDemo) {
        setPenalties(DEMO_PENALTY_RECORDS);
      } else {
        setPenalties([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPenalties();
  }, [isDemo]);

  const handlePayPenalty = async (item: PenaltyItem) => {
    setPayingId(item.id);
    try {
      const res = await axiosInstance.post(`/payment/penalties/${item.id}/pay`);
      if (res.data?.success || res.status === 200 || res.status === 201) {
        toast.success(res.data?.message || `Penalty ${item.penaltyId || item.id} settled successfully from wallet.`);
        // Update local status
        setPenalties((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, status: "Resolved", paidAt: new Date().toISOString() } : p))
        );
        // Dispatch wallet update so balance card reflects deduction immediately
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("wallet_updated"));
        }
      } else {
        toast.error(res.data?.message || "Failed to pay penalty");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to pay penalty. Check your wallet balance.";
      toast.error(msg);
    } finally {
      setPayingId(null);
    }
  };

  const activeCount = penalties.filter((p) => p.status === "Active").length;
  const totalActiveAmount = penalties
    .filter((p) => p.status === "Active")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="bg-white dark:bg-card rounded-xl border border-gray-100 dark:border-border p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-foreground">Penalty & Compliance</h3>
          <p className="text-sm text-gray-500 dark:text-muted-foreground mt-0.5">
            Penalty records, compliance warnings, and immediate wallet settlement for this account.
          </p>
        </div>
        <button
          onClick={fetchPenalties}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 border border-gray-200 dark:border-border rounded-lg hover:bg-gray-50 dark:hover:bg-muted transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {activeCount} Active Compliance {activeCount === 1 ? "Penalty" : "Penalties"}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Outstanding penalties may restrict withdrawals or project visibility until resolved.
              </p>
            </div>
          </div>
          <span className="text-base font-bold text-amber-800 dark:text-amber-200 shrink-0">
            ${totalActiveAmount.toFixed(2)} USD
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-border text-left text-gray-500 dark:text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">Record ID</th>
              <th className="pb-3 pr-4 font-medium">Reason</th>
              <th className="pb-3 pr-4 font-medium">Amount</th>
              <th className="pb-3 pr-4 font-medium">Issued Date</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : penalties.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-gray-500 dark:text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  No penalty records found. Your account is in good standing!
                </td>
              </tr>
            ) : (
              penalties.map((row) => {
                const isActive = row.status === "Active";
                const isBusy = payingId === row.id;

                return (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-border/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 pr-4 font-mono text-xs text-gray-600 dark:text-muted-foreground">
                      {row.penaltyId || row.id}
                    </td>
                    <td className="py-3.5 pr-4 text-gray-800 dark:text-foreground font-medium">
                      {row.reason}
                    </td>
                    <td className="py-3.5 pr-4 font-semibold text-gray-900 dark:text-foreground">
                      ${Number(row.amount).toFixed(2)} {row.currency || "USD"}
                    </td>
                    <td className="py-3.5 pr-4 text-gray-500 dark:text-muted-foreground text-xs">
                      {row.date}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isActive
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}
                      >
                        {isActive ? <AlertCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {isActive ? (
                        <button
                          onClick={() => handlePayPenalty(row)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isBusy ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Paying...
                            </>
                          ) : (
                            <>
                              <DollarSign className="w-3 h-3" />
                              Pay with Wallet
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">Paid</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
