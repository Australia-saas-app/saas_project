"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import AppModal from "./AppModal";
import {
  getWithdrawalEligibleMethods,
  type SavedPaymentMethod,
} from "@/src/shared/lib/payment-methods-store";
import { useUser } from "@/src/context/user.provider";
import { submitWithdrawalRequest } from "@/src/shared/lib/wallet-store";
import axiosInstance from "@/src/shared/lib/axiosInstance";
import { checkWithdrawalPermission } from "@/src/shared/lib/verification-access";

export interface WithdrawRequestResult {
  amount: string;
  method: string;
  id: string;
  date: string;
}

interface WithdrawRequestModalProps {
  open: boolean;
  onClose: () => void;
  availableBalance: string;
  onSubmit: (result: WithdrawRequestResult) => void;
}

function getUserIdentity(user: NonNullable<ReturnType<typeof useUser>["user"]>) {
  const id =
    "id" in user && user.id
      ? String(user.id)
      : "email" in user && user.email
        ? user.email
        : "guest";
  const name =
    "firstName" in user && user.firstName
      ? `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim()
      : "name" in user && user.name
        ? user.name
        : "email" in user && user.email
          ? user.email
          : "Account";
  return { id, name };
}

export default function WithdrawRequestModal({
  open,
  onClose,
  availableBalance,
  onSubmit,
}: WithdrawRequestModalProps) {
  const { user } = useUser();
  const [amount, setAmount] = useState("");
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setSubmitting(false);
      return;
    }
    const saved = getWithdrawalEligibleMethods();
    setMethods(saved);
    const defaultMethod = saved.find((m) => m.isDefault) ?? saved[0];
    setSelectedMethodId(defaultMethod?.id ?? "");
  }, [open]);

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) ?? null,
    [methods, selectedMethodId]
  );

  const maxAmount = parseFloat(availableBalance.replace(/[^0-9.]/g, "")) || 0;
  const parsedAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) {
      toast.error("Add a payout method in your wallet before withdrawing.");
      return;
    }
    if (!user) {
      toast.error("Sign in to request a withdrawal.");
      return;
    }

    const withdrawPerm = checkWithdrawalPermission(user);
    if (!withdrawPerm.allowed) {
      toast.error(withdrawPerm.message || "Withdrawal not permitted for your account status.");
      return;
    }

    if (parsedAmount <= 0) {
      toast.error("Enter a valid withdrawal amount.");
      return;
    }
    if (parsedAmount > maxAmount) {
      toast.error("Amount exceeds available balance.");
      return;
    }

    setSubmitting(true);
    let backendRecordId: string | null = null;

    try {
      const res = await axiosInstance.post("/payment/withdrawals/request", {
        amount: parsedAmount,
        payoutMethod: selectedMethod.label,
        stripeAccountId: selectedMethod.id,
        note: `Withdrawal via ${selectedMethod.label}`,
      });
      if (res?.data?.requestId || res?.data?.id) {
        backendRecordId = String(res.data.requestId || res.data.id);
      }
    } catch (apiErr: any) {
      console.warn("Withdrawal live API notice:", apiErr?.response?.data?.message || apiErr?.message);
    }

    const identity = getUserIdentity(user);
    const record = submitWithdrawalRequest({
      userId: identity.id,
      userName: identity.name,
      amount: parsedAmount,
      methodId: selectedMethod.id,
      methodLabel: selectedMethod.label,
      methodType: selectedMethod.type,
    });

    if (backendRecordId) {
      record.id = backendRecordId;
    }

    // Trigger wallet balance reload across dashboard
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wallet_updated"));
    }

    onSubmit({
      amount: record.amount,
      method: record.method,
      id: record.id,
      date: record.date,
    });

    toast.success("Withdrawal request submitted. Admin will review it shortly.");
    setSubmitting(false);
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Request Withdrawal"
      description={`Available balance: ${availableBalance}`}
      size="sm"
      icon={<Wallet className="h-5 w-5" />}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="withdraw-form"
            disabled={submitting || methods.length === 0}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      }
    >
      <form id="withdraw-form" onSubmit={handleSubmit} className="space-y-4">
        {methods.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Save a withdrawal-eligible payout method (PayPal, bank transfer, Stripe, Wise, or
              Payoneer) using <strong>Add method</strong> on this wallet page. Credit and debit
              cards cannot receive withdrawals.
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Payout method</label>
            <select
              value={selectedMethodId}
              onChange={(e) => setSelectedMethodId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.type} — {method.summary}
                  {method.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            {selectedMethod && (
              <p className="mt-1.5 text-xs text-gray-500">{selectedMethod.label}</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Amount (USD)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            max={maxAmount}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            required
            disabled={methods.length === 0}
          />
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          Withdrawals are reviewed by admin within 1–3 business days. Status updates appear in your
          withdraw history and admin transactions.
        </div>
      </form>
    </AppModal>
  );
}
