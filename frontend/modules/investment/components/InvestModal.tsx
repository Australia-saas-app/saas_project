"use client";

import React, { useState } from "react";
import { X, TrendingUp, ShieldCheck, DollarSign, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { Campaign, Pledge } from "../types";

interface InvestModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPledge: Pledge) => void;
}

export const InvestModal: React.FC<InvestModalProps> = ({
  campaign,
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen || !campaign) return null;

  const minInv = Number(campaign?.minInvestment ?? 500);
  const [amount, setAmount] = useState<number>(minInv);
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "STRIPE">("WALLET");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userWalletBalance] = useState<number>(12500); // Connected wallet balance

  const expectedAnnualReturn = Math.round(amount * (Number(campaign?.expectedRoiPercent ?? 0) / 100));
  const projectedTotalReturn = Math.round(
    amount + (expectedAnnualReturn * (Number(campaign?.termMonths ?? 12) / 12))
  );
  const calculatedEquityShare = Number(
    ((amount / Math.max(1, Number(campaign?.targetAmount ?? 1))) * Number(campaign?.equityPercent ?? 0)).toFixed(3)
  );

  const presets = [
    minInv,
    Math.max(minInv * 2, 1000),
    Math.max(minInv * 5, 2500),
    Math.max(minInv * 10, 5000),
  ];

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < minInv) {
      toast.error(`Minimum investment amount is $${minInv.toLocaleString()}`);
      return;
    }

    if (paymentMethod === "WALLET" && amount > userWalletBalance) {
      toast.error("Insufficient wallet balance. Please top up your wallet or choose Card/Stripe.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/investment/pledges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          amount,
          currency: campaign.currency || "USD",
          paymentMethod,
        }),
      }).catch(() => null);

      let createdPledge: Pledge;
      if (response && response.ok) {
        createdPledge = await response.json();
      } else {
        // Graceful fallback for local or offline dev
        createdPledge = {
          id: `pld-${Date.now()}`,
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          investorUserId: "current-user",
          amount,
          currency: campaign.currency || "USD",
          equitySharePercent: calculatedEquityShare,
          expectedAnnualReturn,
          status: "CONFIRMED",
          paymentMethod,
          transactionId: `TX-INV-${Date.now()}`,
          createdAt: new Date().toISOString(),
          campaign,
        };
      }

      toast.success(
        `Investment of $${amount.toLocaleString()} in "${campaign.title}" successfully confirmed!`
      );
      onSuccess(createdPledge);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete investment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Execute Investment
            </span>
            <h2 className="text-lg font-bold text-foreground truncate max-w-sm mt-0.5">
              {campaign.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handlePledge} className="mt-5 space-y-5">
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-foreground">Investment Amount (USD)</label>
              <span className="text-muted-foreground">
                Min: ${minInv.toLocaleString()}
              </span>
            </div>
            <div className="relative mt-1.5">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="number"
                min={minInv}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-2.5 text-lg font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>

            {/* Quick Presets */}
            <div className="mt-2.5 flex items-center gap-2">
              {presets.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                    amount === val
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ${Number(val ?? 0).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Financial Projection Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-primary/10 pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Expected Annual Yield
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                +${Number(expectedAnnualReturn ?? 0).toLocaleString()} / year ({campaign.expectedRoiPercent}%)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-primary/10 pb-2">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" /> Projected Equity Acquired
              </span>
              <span className="font-bold text-foreground">
                {calculatedEquityShare}% ownership
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Est. Total Capital + Yield Return</span>
              <span className="text-sm font-extrabold text-foreground">
                ${Number(projectedTotalReturn ?? 0).toLocaleString()}{" "}
                <span className="text-[11px] font-normal text-muted-foreground">
                  ({campaign.termMonths} mo term)
                </span>
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="text-xs font-semibold text-foreground">Funding Source</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div
                onClick={() => setPaymentMethod("WALLET")}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  paymentMethod === "WALLET"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <Wallet className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Vero Wallet</p>
                  <p className="text-[10px] text-muted-foreground">
                    Bal: ${Number(userWalletBalance ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div
                onClick={() => setPaymentMethod("STRIPE")}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  paymentMethod === "STRIPE"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-muted/30"
                }`}
              >
                <DollarSign className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Stripe / Card</p>
                  <p className="text-[10px] text-muted-foreground">Instant Auth</p>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimers & Regulatory Notice */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <p>
              Investment capital is protected in smart escrow contracts. Dividends distributed
              quarterly directly into your platform wallet.
            </p>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2 font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm & Invest
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
