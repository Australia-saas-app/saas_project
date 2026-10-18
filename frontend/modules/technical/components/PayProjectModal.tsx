"use client";

import { useEffect, useState } from "react";
import { CreditCard, Wallet, Loader2, AlertTriangle, CheckCircle2, X, XCircle, ShieldAlert, Layers, Flag } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { fetchWalletBalance, payProject } from "../services/technical.services";
import { useUser } from "@/src/context/user.provider";
import { useRouter } from "next/navigation";
import axiosInstance from "@/src/lib/axiosInstance";
import Link from "next/link";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";

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
  startDate?: string;
  endDate?: string;
  commissionPercent?: number;
  adminNotes?: string;
  requirements?: string;
  conditions?: string;
  milestones?: Milestone[];
}

interface Props {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayProjectModal({ project, onClose, onSuccess }: Props) {
  const { user } = useUser();
  const router = useRouter();

  const baseBudget = Number(project.adminBudget || project.price || 0);
  const commissionPercent = project.commissionPercent !== undefined ? project.commissionPercent : 10;
  const commissionAmount = (baseBudget * commissionPercent) / 100;
  const totalBudget = baseBudget + commissionAmount;
  const currency = project.currency || "USD";
  const isMilestone = project.paymentTerms === "milestone" && project.milestones && project.milestones.length > 0;

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    isMilestone ? project.milestones?.find((m) => m.status !== "funded" && m.status !== "released") || null : null
  );

  const basePaymentAmount = isMilestone && selectedMilestone ? Number(selectedMilestone.amount) : baseBudget;
  const milestoneCommission = (basePaymentAmount * commissionPercent) / 100;
  const paymentAmount = isMilestone && selectedMilestone ? basePaymentAmount + milestoneCommission : totalBudget;

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [kycFailed, setKycFailed] = useState(false);

  useEffect(() => {
    fetchWalletBalance()
      .then((d: { balance?: number }) => setBalance(d?.balance ?? null))
      .catch(() => setBalance(null))
      .finally(() => setLoadingBalance(false));
  }, []);

  const sufficient = balance !== null && balance >= paymentAmount;

  const handlePay = async () => {
    setPaying(true);
    setKycFailed(false);

    try {
      // 1. Check user KYC verification status with spinner active
      let isVerified = false;
      try {
        const res = await axiosInstance.get("/users/me").catch(() => null);
        const latestUser = res?.data?.data?.user || res?.data?.user || res?.data;
        const kyc = String(latestUser?.kycStatus || (user as any)?.kycStatus || "").toLowerCase();
        const st = String(latestUser?.status || (user as any)?.status || "").toLowerCase();
        isVerified = kyc === "approved" || kyc === "verified" || st === "verified";
      } catch {
        const kyc = String((user as any)?.kycStatus || "").toLowerCase();
        const st = String((user as any)?.status || "").toLowerCase();
        isVerified = kyc === "approved" || kyc === "verified" || st === "verified";
      }

      // Check local storage overrides as well
      if (typeof window !== "undefined" && !isVerified) {
        try {
          const uid = (user as any)?.id || (user as any)?.userId;
          if (uid) {
            const raw = localStorage.getItem(`user_profile_overrides_${uid}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.kycStatus?.toLowerCase() === "approved") {
                isVerified = true;
              }
            }
          }
        } catch {}
      }

      // If unverified, show "Failed to Pay" KYC screen
      if (!isVerified) {
        await new Promise((r) => setTimeout(r, 600));
        setKycFailed(true);
        setPaying(false);
        return;
      }

      // 2. If verified, continue payment flow
      await payProject(project.projectId);
      try {
        const clientFullName =
          (user as any)?.fullName ||
          (user as any)?.name ||
          (project as any)?.clientName ||
          "User";
        const baseBudget = Number(project.adminBudget || project.price || (project as any).budgetAmount || 0);
        const commRate = Number(project.commissionPercent ?? 10);
        const totalWithFee = Number((baseBudget + (baseBudget * commRate) / 100).toFixed(2));
        await recordRealActivity(
          "PROJECT_PAID",
          `Paid $${totalWithFee.toFixed(2)} USD for "${project.title}" (${project.projectId})`,
          {
            userId: (user as any)?.id || (user as any)?.userId,
            name: clientFullName,
            fullName: clientFullName,
            email: user?.email || (project as any)?.clientEmail,
          }
        );
      } catch {}
      setPaid(true);
      toast.success("Payment paid successfully, Project is live Publically");
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const isAlreadyPaid =
    (project as any).paymentStatus === "paid" ||
    (project as any).paymentStatus === "released" ||
    (project as any).submissionStatus === "active" ||
    (project as any).submissionStatus === "in_progress" ||
    (project as any).submissionStatus === "completed" ||
    (project as any).submissionStatus === "accepted";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
      <div
        style={{ width: "420px", maxWidth: "calc(100vw - 32px)" }}
        className="rounded-2xl bg-card border border-border text-card-foreground shadow-2xl transition-all my-auto max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2">
            {paid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : kycFailed ? (
              <ShieldAlert className="h-5 w-5 text-amber-500" />
            ) : isAlreadyPaid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <CreditCard className="h-5 w-5 text-primary" />
            )}
            <h3 className="text-lg font-bold text-foreground">
              {paid
                ? "Payment Successful"
                : kycFailed
                ? "Verification Required"
                : isAlreadyPaid
                ? "Escrow Payment Details"
                : isMilestone
                ? "Fund Project Milestone"
                : "Pay for Project Escrow"}
            </h3>
          </div>
          <button
            onClick={paid ? onSuccess : onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {paid ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500 animate-bounce" />
              <p className="text-lg font-bold text-foreground">Payment Successful!</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Your project is now <strong>Live</strong> and open for verified businesses to accept and start working on deliverables.
              </p>
              <Button
                type="button"
                onClick={onSuccess}
                className="w-full mt-3 rounded-xl font-bold py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md"
              >
                OK
              </Button>
            </div>
          ) : kycFailed ? (
            <div className="flex flex-col items-center gap-3.5 py-4 text-center animate-in fade-in zoom-in-95 duration-200">
              {/* Glowing Shield Badge */}
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/10">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
              </div>

              {/* Tag & Title */}
              <div className="space-y-1 mt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  &quot;Unverified&quot; Account
                </span>
                <h3 className="text-lg font-extrabold text-foreground tracking-tight pt-1">
                  KYC application is missing
                </h3>
              </div>

              {/* Main message */}
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Please submit your KYC application to verify your account
              </p>

              {/* Info Card */}
              <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-3.5 text-left text-xs space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Identity Verification Required
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
                  To protect your funds and secure escrow transactions, you must verify your identity before publishing technical projects.
                </p>
              </div>

              {/* Actions */}
              <div className="w-full space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/dashboard/user/profile");
                  }}
                  className="w-full rounded-xl font-bold py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-md"
                >
                  Submit KYC Application
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setKycFailed(false);
                    onClose();
                  }}
                  className="w-full rounded-xl font-semibold py-2.5 border-border text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : isAlreadyPaid ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold">Escrow Funded & Active</p>
                  <p className="text-[11px] opacity-90">Payment is secured in platform escrow.</p>
                </div>
              </div>

              {/* Project summary */}
              <div className="rounded-xl border border-border p-3.5 space-y-1">
                <p className="text-xs text-muted-foreground font-mono">{project.projectId}</p>
                <p className="text-sm font-bold text-foreground line-clamp-1">{project.title}</p>
              </div>

              {/* Cost breakdown */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Project Base Budget</span>
                  <span className="font-semibold text-foreground">
                    {currency} {baseBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Platform Fee ({commissionPercent}%)</span>
                  <span className="font-semibold text-foreground">
                    {currency} {commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm text-foreground">
                  <span>Total Escrow Paid</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {currency} {totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed">
                🔒 Funds remain safely protected in escrow until deliverables are submitted and you confirm completion.
              </div>

              <Button
                variant="outline"
                className="w-full rounded-xl text-xs font-semibold"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              {/* Project Details & Timeline Summary */}
              <div className="rounded-xl bg-muted/50 p-3.5 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-primary">{project.projectId}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isMilestone ? "Milestone-Based" : "One-Time Payment"}
                  </span>
                </div>
                <p className="font-bold text-sm text-foreground truncate">{project.title}</p>
                
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                  <div>
                    <span>Start: </span>
                    <strong className="text-foreground">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "Immediate"}</strong>
                  </div>
                  <div>
                    <span>End: </span>
                    <strong className="text-foreground">{project.endDate ? new Date(project.endDate).toLocaleDateString() : "Flexible"}</strong>
                  </div>
                </div>

                {project.adminNotes && (
                  <p className="text-[11px] text-muted-foreground italic bg-card/60 p-2 rounded-lg border border-border">
                    <strong>Admin Note:</strong> "{project.adminNotes}"
                  </p>
                )}
              </div>

              {/* Milestone Selector if Milestone-based */}
              {isMilestone && project.milestones && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Flag className="h-3.5 w-3.5 text-primary" /> Select Milestone to Fund:
                  </p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {project.milestones.map((m) => {
                      const isSel = selectedMilestone?.id === m.id;
                      const isFunded = m.status === "funded" || m.status === "released";
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={isFunded}
                          onClick={() => setSelectedMilestone(m)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs text-left transition-all ${
                            isFunded
                              ? "bg-muted/30 border-border/40 text-muted-foreground opacity-60 cursor-not-allowed"
                              : isSel
                                ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                                : "border-border bg-card text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="truncate">{m.title}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
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

              {/* Detailed Financial Breakdown */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Base Project Budget:</span>
                  <strong className="text-foreground">
                    {currency} {basePaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-amber-600 font-medium">
                  <span>Platform Commission ({commissionPercent}%):</span>
                  <strong>
                    +{currency} {(isMilestone && selectedMilestone ? milestoneCommission : commissionAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Tax / GST (10% standard incl.):</span>
                  <strong>
                    {currency} {((paymentAmount * 0.1) / 1.1).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div className="pt-2 border-t border-border flex items-baseline justify-between">
                  <span className="font-bold text-foreground text-xs uppercase tracking-wider">Total Escrow Payable:</span>
                  <span className="text-xl font-extrabold text-primary">
                    {currency} {paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Wallet Balance Card */}
              <div className="rounded-xl border border-border bg-card p-3.5">
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
                  <div className="mt-1.5 flex items-center justify-between">
                    <p
                      className={`text-lg font-bold ${
                        sufficient ? "text-green-600 dark:text-green-400" : "text-red-500"
                      }`}
                    >
                      {currency} {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    {sufficient ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="h-3 w-3" /> Sufficient
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertTriangle className="h-3 w-3" /> Insufficient
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Insufficient Funds Callout */}
              {!loadingBalance && !sufficient && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 p-2.5 text-xs">
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
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
                      Deposit funds →
                    </Link>
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="space-y-1.5 pt-1">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-sm py-4 shadow-sm"
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

                <p className="text-center text-[10px] text-muted-foreground">
                  🔒 Funds are held safely in escrow and only released upon your deliverable approval.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
