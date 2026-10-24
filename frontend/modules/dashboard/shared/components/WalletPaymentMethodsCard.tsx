"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Eye, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import PaymentMethodModal from "./PaymentMethodModal";
import PaymentMethodDetailsModal from "./PaymentMethodDetailsModal";
import ConfirmActionModal from "./ConfirmActionModal";
import {
  deletePaymentMethod,
  readPaymentMethods,
  setDefaultPaymentMethod,
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

  const refresh = useCallback(() => setMethods(readPaymentMethods()), []);

  useEffect(() => {
    refresh();
  }, [open, refresh]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePaymentMethod(deleteTarget.id);
    refresh();
    toast.success("Payment method removed.");
    setDeleteTarget(null);
  };

  const handleSetDefault = (id: string) => {
    setDefaultPaymentMethod(id);
    refresh();
    toast.success("Default payout method updated.");
  };

  return (
    <>
      <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-slate-100">{title}</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>
            <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
              Credit and debit cards can be saved for purchases but are not eligible for
              withdrawals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMethod(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add method
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 px-4 py-6 text-sm text-gray-500 dark:text-slate-400">
            <CreditCard className="h-5 w-5 shrink-0 text-gray-400 dark:text-slate-500" />
            No payment methods saved yet. Add one to enable faster withdrawals.
          </div>
        ) : (
          <ul className="space-y-2">
            {methods.map((method) => (
              <li
                key={method.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-gray-50/50 dark:hover:bg-slate-800/40 px-4 py-3 text-sm transition-colors sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-slate-100">
                    {method.label}
                    {method.isDefault && (
                      <span className="ml-2 rounded-full bg-green-100 dark:bg-green-950/60 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                        Default
                      </span>
                    )}
                    {!isWithdrawalEligible(method.type) && (
                      <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        Pay-in only
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {method.type} · {method.summary}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(method)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    title="View details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>
                  {!method.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(method.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Star className="h-3.5 w-3.5" />
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(method)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 px-3 py-1.5 text-[11px] font-semibold text-red-700 dark:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-950/60 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
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
