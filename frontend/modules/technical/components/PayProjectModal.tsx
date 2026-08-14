"use client";

import { useEffect, useState } from "react";
import { CreditCard, Wallet, Loader2, AlertTriangle, CheckCircle2, X, Layers, Flag } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { fetchWalletBalance, payProject } from "../services/technical.services";
import Link from "next/link";

interface Milestone {
  id: string;
  title: string;
  amount: number;
  status: string;
}

interface Project {
  projectId: string;
  title: string;
  adminBudget?: number;
  price?: number;
  currency?: string;
  paymentTerms?: string;
  milestones?: Milestone[];
}

interface Props {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayProjectModal({ project, onClose, onSuccess }: Props) {
  const totalBudget = Number(project.adminBudget || project.price || 0);
  const currency = project.currency || "USD";
  const isMilestone = project.paymentTerms === "milestone" && project.milestones && project.milestones.length > 0;

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    isMilestone ? project.milestones?.find((m) => m.status !== "funded" && m.status !== "released") || null : null
  );

  const paymentAmount = isMilestone && selectedMilestone ? Number(selectedMilestone.amount) : totalBudget;

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetchWalletBalance()
      .then((d) => setBalance(d?.balance ?? null))
      .catch(() => setBalance(null))
      .finally(() => setLoadingBalance(false));
  }, []);

  const sufficient = balance !== null && balance >= paymentAmount;

  const handlePay = async () => {
    setPaying(true);
    try {
      await payProject(project.projectId);
      setPaid(true);
      toast.success("Payment successful! Your project is now funded & live.");
      setTimeout(onSuccess, 1500);
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border text-card-foreground shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">
              {isMilestone ? "Fund Project Milestone" : "Pay for Project"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {paid ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500 animate-bounce" />
              <p className="text-lg font-bold text-foreground">Payment Successful!</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Your project has been funded into escrow and is now open for verified businesses to accept.
              </p>
            </div>
          ) : (
            <>
              {/* Project & Budget Summary */}
              <div className="rounded-xl bg-muted/60 p-4 border border-border/50">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Project</p>
                <p className="mt-1 font-bold text-foreground truncate">{project.title}</p>
                
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isMilestone && selectedMilestone ? `Milestone (${selectedMilestone.title})` : "Total Budget"}
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold text-primary">
                      {currency} {paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {isMilestone ? "Milestone-Based" : "One-Time Payment"}
                  </span>
                </div>
              </div>

              {/* Milestone Selector if Milestone-based */}
              {isMilestone && project.milestones && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Flag className="h-3.5 w-3.5 text-primary" /> Select Milestone to Fund:
                  </p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {project.milestones.map((m) => {
                      const isSel = selectedMilestone?.id === m.id;
                      const isFunded = m.status === "funded" || m.status === "released";
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={isFunded}
                          onClick={() => setSelectedMilestone(m)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs text-left transition-all ${
                            isFunded
                              ? "bg-muted/30 border-border/40 text-muted-foreground opacity-60 cursor-not-allowed"
                              : isSel
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="truncate">{m.title}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span>{currency} {Number(m.amount).toLocaleString()}</span>
                            {isFunded && (
                              <span className="rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 text-[10px]">
                                Funded
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Wallet Balance Card */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-primary" /> Available Wallet Balance
                  </span>
                  <Link
                    href="/user/wallet"
                    onClick={onClose}
                    className="text-primary hover:underline font-semibold text-[11px]"
                  >
                    + Add Money
                  </Link>
                </div>
                {loadingBalance ? (
                  <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />
                ) : balance === null ? (
                  <p className="mt-1 text-sm text-red-500">Could not load wallet balance</p>
                ) : (
                  <div className="mt-2 flex items-center justify-between">
                    <p
                      className={`text-xl font-bold ${
                        sufficient ? "text-green-600 dark:text-green-400" : "text-red-500"
                      }`}
                    >
                      {currency} {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    {sufficient ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" /> Sufficient
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" /> Insufficient
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Insufficient Funds Callout */}
              {!loadingBalance && !sufficient && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    You need{" "}
                    <strong>
                      {currency}{" "}
                      {(paymentAmount - (balance ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>{" "}
                    more to fund this project.{" "}
                    <Link
                      href="/user/wallet"
                      className="underline font-bold text-amber-900 dark:text-amber-200 hover:text-primary"
                      onClick={onClose}
                    >
                      Deposit funds now →
                    </Link>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm py-5 shadow-sm"
                  onClick={handlePay}
                  disabled={!sufficient || paying || loadingBalance}
                >
                  {paying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing Escrow Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Confirm &amp; Pay {currency} {paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </>
                  )}
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  🔒 Funds are held securely in platform escrow and only released when deliverables are accepted.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
