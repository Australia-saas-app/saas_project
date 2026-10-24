"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import PaymentMethodModal from "./PaymentMethodModal";
import PaymentMethodDetailsModal from "./PaymentMethodDetailsModal";
import ConfirmActionModal from "./ConfirmActionModal";
import {
  deletePaymentMethodDb,
  fetchPaymentMethodsFromDb,
  readPaymentMethods,
  setDefaultPaymentMethodDb,
  isWithdrawalEligible,
  type SavedPaymentMethod,
} from "@/src/shared/lib/payment-methods-store";

interface WalletPaymentMethodsCardProps {
  title?: string;
  subtitle?: string;
}

export default function WalletPaymentMethodsCard({
  title = "Payment methods",
  subtitle = "Manage payout methods used for withdrawals and project payments.",
}: WalletPaymentMethodsCardProps) {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [open, setOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<SavedPaymentMethod | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<SavedPaymentMethod | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedPaymentMethod | null>(null);

  const refresh = useCallback(async () => {
    // 1. Instant local render
    setMethods(readPaymentMethods());
    // 2. Fresh sync from database
    const fresh = await fetchPaymentMethodsFromDb();
    setMethods(fresh);
  }, []);

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    window.addEventListener("wallet_updated", handleUpdate);
    return () => window.removeEventListener("wallet_updated", handleUpdate);
  }, [open, refresh]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePaymentMethodDb(deleteTarget.id);
    await refresh();
    toast.success("Payment method removed.");
    setDeleteTarget(null);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultPaymentMethodDb(id);
    await refresh();
    toast.success("Default payout method updated.");
  };

  return (
    <>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
            <p className="mt-2 text-[11px] text-gray-500">
              Saved payout methods and cards can be selected for real-time wallet withdrawals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMethod(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add method
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-sm text-gray-500">
            <CreditCard className="h-5 w-5 shrink-0 text-gray-400" />
            No payment methods saved yet. Add one to enable faster withdrawals.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {methods.map((method) => (
              <li
                key={method.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/60 px-4 py-3 text-sm transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="truncate">{method.label}</span>
                      {method.isDefault && (
                        <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Default
                        </span>
                      )}
                      {!isWithdrawalEligible(method.type) && (
                        <span className="shrink-0 rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          Pay-in only
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {method.type} · {method.summary}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsTarget(method)}
                  className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                  title="View details"
                  aria-label={`View details for ${method.label}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PaymentMethodModal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingMethod(null);
        }}
        editingMethod={editingMethod}
        onSaved={() => refresh()}
      />

      <PaymentMethodDetailsModal
        open={Boolean(detailsTarget)}
        onClose={() => setDetailsTarget(null)}
        method={detailsTarget}
        onEdit={(m) => {
          setDetailsTarget(null);
          setEditingMethod(m);
          setOpen(true);
        }}
        onDelete={(m) => {
          setDetailsTarget(null);
          setDeleteTarget(m);
        }}
        onSetDefault={(m) => {
          handleSetDefault(m.id);
          setDetailsTarget(null);
        }}
      />

      <ConfirmActionModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove payment method?"
        description="This payout method will be removed from your wallet. You can add it again later if needed."
        confirmLabel="Remove method"
        variant="danger"
        itemName={deleteTarget?.label}
      />
    </>
  );
}
