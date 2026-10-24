"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AppModal from "./AppModal";
import { Button } from "@/src/components/ui/button";
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_FIELDS,
  buildDefaultLabel,
  buildPaymentMethodSummary,
  sanitizePaymentDetails,
  validatePaymentDetails,
  type PaymentMethodType,
} from "@/src/shared/lib/payment-method-config";
import {
  savePaymentMethod,
  updatePaymentMethod,
  type SavedPaymentMethod,
} from "@/src/shared/lib/payment-methods-store";
import { saveWalletCard } from "@/src/modules/technical/services/technical.services";

export { PAYMENT_METHOD_OPTIONS, type PaymentMethodType };
export type { SavedPaymentMethod };
export { readPaymentMethods, savePaymentMethod, updatePaymentMethod } from "@/src/shared/lib/payment-methods-store";

interface PaymentMethodModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (method: SavedPaymentMethod) => void;
  editingMethod?: SavedPaymentMethod | null;
}

function emptyDetails(type: PaymentMethodType): Record<string, string> {
  return Object.fromEntries(PAYMENT_METHOD_FIELDS[type].map((f) => [f.key, ""]));
}

export default function PaymentMethodModal({
  open,
  onClose,
  onSaved,
  editingMethod = null,
}: PaymentMethodModalProps) {
  const [type, setType] = useState<PaymentMethodType>(PAYMENT_METHOD_OPTIONS[0]);
  const [details, setDetails] = useState<Record<string, string>>(() =>
    emptyDetails(PAYMENT_METHOD_OPTIONS[0])
  );
  const [label, setLabel] = useState("");
  const [useCustomLabel, setUseCustomLabel] = useState(false);
  const [isDefault, setIsDefault] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fields = PAYMENT_METHOD_FIELDS[type];

  useEffect(() => {
    if (!open) {
      setType(PAYMENT_METHOD_OPTIONS[0]);
      setDetails(emptyDetails(PAYMENT_METHOD_OPTIONS[0]));
      setLabel("");
      setUseCustomLabel(false);
      setIsDefault(true);
      setSubmitting(false);
      return;
    }

    if (editingMethod) {
      setType(editingMethod.type);
      setDetails({ ...emptyDetails(editingMethod.type), ...(editingMethod.details || {}) });
      const defaultLbl = buildDefaultLabel(editingMethod.type, editingMethod.details || {});
      const hasCustom = Boolean(editingMethod.label && editingMethod.label !== defaultLbl);
      setUseCustomLabel(hasCustom);
      setLabel(editingMethod.label || "");
      setIsDefault(Boolean(editingMethod.isDefault));
      setSubmitting(false);
    } else {
      setType(PAYMENT_METHOD_OPTIONS[0]);
      setDetails(emptyDetails(PAYMENT_METHOD_OPTIONS[0]));
      setLabel("");
      setUseCustomLabel(false);
      setIsDefault(true);
      setSubmitting(false);
    }
  }, [open, editingMethod]);

  const autoLabel = useMemo(() => buildDefaultLabel(type, details), [type, details]);

  const handleTypeChange = (nextType: PaymentMethodType) => {
    setType(nextType);
    setDetails(emptyDetails(nextType));
    if (!useCustomLabel) setLabel("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validatePaymentDetails(type, details);
    if (error) {
      toast.error(error);
      return;
    }

    const sanitized = sanitizePaymentDetails(type, details);
    const summary = buildPaymentMethodSummary(type, sanitized);
    const finalLabel = (useCustomLabel ? label : autoLabel).trim() || autoLabel;

    setSubmitting(true);
    if (type === "Credit / Debit Card" || sanitized.cardNumber) {
      try {
        const parts = (sanitized.expiry || "").split("/");
        const expMonth = parts[0]?.trim() || "12";
        const expYearRaw = parts[1]?.trim() || "2030";
        const expYear = expYearRaw.length === 2 ? `20${expYearRaw}` : expYearRaw;
        await saveWalletCard({
          cardHolderName: sanitized.cardholderName || sanitized.cardHolderName || "Cardholder",
          cardNumber: (sanitized.cardNumber || "").replace(/\s+/g, ""),
          expiryMonth: expMonth,
          expiryYear: expYear,
          cardBrand: (sanitized.cardNumber || "").startsWith("4")
            ? "Visa"
            : (sanitized.cardNumber || "").startsWith("5")
            ? "Mastercard"
            : (sanitized.cardNumber || "").startsWith("3")
            ? "American Express"
            : "Card",
          isDefault: isDefault,
        });
      } catch {}
    } else {
      await new Promise((r) => setTimeout(r, 350));
    }

    let savedResult: SavedPaymentMethod | null = null;
    if (editingMethod?.id) {
      savedResult =
        updatePaymentMethod(editingMethod.id, {
          label: finalLabel,
          summary,
          details: sanitized,
          isDefault,
        }) ?? null;
      toast.success(`${type} payment method updated.`);
    } else {
      savedResult = savePaymentMethod({
        type,
        label: finalLabel,
        summary,
        details: sanitized,
        isDefault,
      });
      toast.success(`${type} payout method saved.`);
    }

    setSubmitting(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wallet_updated"));
    }
    if (savedResult) {
      onSaved?.(savedResult);
    }
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={editingMethod ? `Edit ${type} payment method` : `Add ${type} payout method`}
      description="Enter the details required for this payment provider. Fields change based on the method you select."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground dark:text-slate-200">
            Payment method
          </label>
          <select
            value={type}
            disabled={Boolean(editingMethod)}
            onChange={(e) => handleTypeChange(e.target.value as PaymentMethodType)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* High contrast info pill */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-50/80 dark:bg-blue-950/40 px-3.5 py-2.5 text-xs font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
          {type === "PayPal" && "Withdrawals will be sent to your PayPal email address."}
          {type === "Bank Transfer" &&
            "Provide your bank details exactly as they appear on your account."}
          {type === "Stripe" && "Link the Stripe account that should receive platform payouts."}
          {type === "Wise" && "Use the email and currency tied to your Wise recipient profile."}
          {type === "Payoneer" && "Enter the Payoneer email registered for receiving payments."}
          {type === "Credit / Debit Card" &&
            "Cards are saved securely for purchases and pay-in only. Withdrawals require PayPal, bank transfer, Stripe, Wise, or Payoneer."}
        </div>

        {/* Fields list */}
        <div className="space-y-3.5">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 block text-xs sm:text-sm font-medium text-foreground dark:text-slate-200">
                {field.label}
                {field.required && <span className="text-red-500 font-bold"> *</span>}
              </label>
              {field.type === "select" ? (
                <select
                  value={details[field.key] || ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">Select…</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "email" ? "email" : field.type === "month" ? "month" : "text"}
                  value={details[field.key] || ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                />
              )}
              {field.helpText && (
                <p className="mt-1 text-xs text-muted-foreground">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground dark:text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomLabel}
              onChange={(e) => {
                setUseCustomLabel(e.target.checked);
                if (!e.target.checked) setLabel("");
              }}
              className="rounded border-input text-blue-600 focus:ring-blue-500"
            />
            Use a custom display name
          </label>
          {useCustomLabel ? (
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
              placeholder="e.g. Primary PayPal"
            />
          ) : (
            <p className="mt-1.5 rounded-lg border border-border bg-muted/40 dark:bg-card px-3 py-2 text-xs sm:text-sm text-foreground">
              {autoLabel}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-input text-blue-600 focus:ring-blue-500"
          />
          Set as default payout method
        </label>

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-border text-foreground hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingMethod ? "Updating…" : "Saving…"}
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                {editingMethod ? "Update Method" : `Save ${type}`}
              </>
            )}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
