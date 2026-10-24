"use client";

import React from "react";
import {
  CreditCard,
  Building2,
  DollarSign,
  Eye,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import AppModal from "./AppModal";
import { Button } from "@/src/components/ui/button";
import {
  isWithdrawalEligible,
  type SavedPaymentMethod,
} from "@/src/shared/lib/payment-methods-store";

interface PaymentMethodDetailsModalProps {
  open: boolean;
  onClose: () => void;
  method: SavedPaymentMethod | null;
  onEdit: (method: SavedPaymentMethod) => void;
  onDelete: (method: SavedPaymentMethod) => void;
  onSetDefault: (method: SavedPaymentMethod) => void;
}

export default function PaymentMethodDetailsModal({
  open,
  onClose,
  method,
  onEdit,
  onDelete,
  onSetDefault,
}: PaymentMethodDetailsModalProps) {
  if (!method) return null;

  const isEligible = isWithdrawalEligible(method.type);
  const details = method.details || {};

  const getMethodIcon = () => {
    switch (method.type) {
      case "Bank Transfer":
        return <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
      case "PayPal":
      case "Wise":
      case "Payoneer":
      case "Stripe":
        return <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
      case "Credit / Debit Card":
      default:
        return <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const renderDetailRows = () => {
    switch (method.type) {
      case "Bank Transfer":
        return [
          { label: "Bank Name", value: details.bankName || "—" },
          { label: "Account Holder", value: details.accountName || "—" },
          { label: "Account / IBAN", value: details.accountNumber || "—", isCode: true },
          { label: "Routing / SWIFT / BIC", value: details.routingNumber || "—", isCode: true },
          { label: "Bank Country", value: details.country || "—" },
          { label: "Payout Currency", value: details.currency || "USD" },
        ];
      case "Credit / Debit Card":
        return [
          { label: "Cardholder Name", value: details.cardholderName || details.cardHolderName || "—" },
          { label: "Card Number", value: details.cardNumber || "•••• •••• •••• " + (details.cardLast4 || "••••"), isCode: true },
          { label: "Expiry Date", value: details.expiry || "—" },
          { label: "Security Code (CVC)", value: details.cvc ? "•••" : "—" },
          { label: "Billing Country", value: details.billingCountry || "—" },
          { label: "Billing ZIP / Postal", value: details.billingZip || "—" },
        ];
      case "PayPal":
        return [
          { label: "PayPal Email", value: details.paypalEmail || "—" },
          { label: "Account Holder Name", value: details.accountName || "—" },
          { label: "Country", value: details.country || "—" },
        ];
      case "Wise":
        return [
          { label: "Wise Account Email", value: details.wiseEmail || "—" },
          { label: "Recipient Name", value: details.recipientName || "—" },
          { label: "Wise Tag", value: details.wiseTag || "—" },
          { label: "Preferred Currency", value: details.currency || "USD" },
          { label: "Country", value: details.country || "—" },
        ];
      case "Payoneer":
        return [
          { label: "Payoneer Email", value: details.payoneerEmail || "—" },
          { label: "Account Holder Name", value: details.accountName || "—" },
          { label: "Customer ID", value: details.payoneerId || "—" },
          { label: "Country", value: details.country || "—" },
        ];
      case "Stripe":
        return [
          { label: "Stripe Email", value: details.stripeEmail || "—" },
          { label: "Account / Business Name", value: details.accountName || "—" },
          { label: "Stripe Account ID", value: details.stripeAccountId || "—", isCode: true },
        ];
      default:
        return Object.entries(details).map(([k, v]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          value: String(v || "—"),
        }));
    }
  };

  const detailRows = renderDetailRows();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Payment Method Details"
      description="View, edit, or manage this payout method for your wallet."
      size="md"
      icon={getMethodIcon()}
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDelete(method)}
              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30 w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            {!method.isDefault && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onSetDefault(method)}
                className="border-border text-foreground hover:bg-muted w-full sm:w-auto"
              >
                <Star className="h-4 w-4 mr-1.5 text-amber-500" />
                Make Default
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border text-foreground hover:bg-muted"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => onEdit(method)}
              className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Details
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Method header card */}
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
              {getMethodIcon()}
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>{method.label}</span>
                {method.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Default
                  </span>
                )}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {method.type} · {method.summary}
              </p>
            </div>
          </div>
          <div>
            {isEligible ? (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                Withdrawal Eligible
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-500/10 border border-slate-500/20 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                Pay-in Only
              </span>
            )}
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/40 font-semibold text-xs text-foreground uppercase tracking-wider">
            Account Information
          </div>
          <div className="divide-y divide-border text-xs sm:text-sm">
            {detailRows.map((row, index) => (
              <div key={index} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <span className="font-medium text-muted-foreground">{row.label}</span>
                <span
                  className={`font-semibold text-foreground text-right ${
                    row.isCode ? "font-mono" : ""
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Status / Usage Notice */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-50/60 dark:bg-blue-950/30 px-3.5 py-2.5 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <p className="leading-relaxed">
            {isEligible
              ? "This method is saved and verified for wallet withdrawals and automated payouts."
              : "Cards are saved for platform purchases and wallet top-ups. To receive withdrawals, please add Bank Transfer, PayPal, Wise, or Payoneer."}
          </p>
        </div>
      </div>
    </AppModal>
  );
}
