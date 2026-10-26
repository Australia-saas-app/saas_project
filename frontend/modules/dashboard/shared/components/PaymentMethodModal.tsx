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
  savePaymentMethodDb,
  type SavedPaymentMethod,
} from "@/src/shared/lib/payment-methods-store";
import { saveWalletCard } from "@/src/modules/technical/services/technical.services";
import { useUser } from "@/src/context/user.provider";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";

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
  const { user } = useUser();
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
    try {
      savedResult = await savePaymentMethodDb(
        {
          type,
          label: finalLabel,
          summary,
          details: sanitized,
          isDefault,
        },
        editingMethod?.id
      );
      if (editingMethod?.id) {
        toast.success(`${type} payment method updated.`);
      } else {
        toast.success(`${type} payout method saved.`);
      }

      // Record activity log on requester side
      try {
        const uId = (user as any)?.id || (user as any)?.userId || "user";
        const uEmail = (user as any)?.email || "";
        const uName = (user as any)?.fullName || (user as any)?.name || "User";
        recordRealActivity(
          editingMethod?.id ? "PAYMENT_METHOD_UPDATED" : "PAYMENT_METHOD_ADDED",
          editingMethod?.id
            ? `Updated ${type} payment method (${finalLabel} · ${summary})`
            : `Added new ${type} payout method (${finalLabel} · ${summary})`,
          { userId: uId, email: uEmail, name: uName }
        );
      } catch {}
    } catch {
      toast.error("Failed to save payment method.");
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
          <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-foreground">
            Payment method
          </label>
          <select
            value={type}
            disabled={Boolean(editingMethod)}
            onChange={(e) => handleTypeChange(e.target.value as PaymentMethodType)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* High contrast theme info pill */}
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-xs font-semibold text-primary leading-relaxed">
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
              <label className="mb-1.5 block text-xs sm:text-sm font-semibold text-foreground">
                {field.label}
                {field.required && <span className="text-red-500 font-bold"> *</span>}
              </label>
              {field.type === "select" ? (
                <select
                  value={details[field.key] || ""}
                  onChange={(e) => setDetails((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground cursor-pointer"
                >
                  <option value="">Select…</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt} value={opt}>
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
          <label className="mb-1.5 flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomLabel}
              onChange={(e) => {
                setUseCustomLabel(e.target.checked);
                if (!e.target.checked) setLabel("");
              }}
              className="rounded border-input text-primary focus:ring-primary accent-primary"
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

        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-input text-primary focus:ring-primary accent-primary"
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
            className="bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm transition-all cursor-pointer"
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
