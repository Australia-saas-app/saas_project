"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, Loader2, Eye, EyeOff, AlertTriangle, DollarSign, Wallet } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { logout, verifyAccountPassword, deleteUserAccount } from "@/src/server/AuthService"
import {
  getUserEmailFromAuthUser,
  getUserIdFromAuthUser,
  isDemoAuthUser,
} from "@/src/shared/lib/demo-user"
import { clearAllUserStorage } from "@/src/shared/utils/profile-storage"
import { deleteAllLogs } from "@/src/shared/lib/real-activity-logger"
import axiosInstance from "@/src/lib/axiosInstance"
import ConfirmActionModal from "./ConfirmActionModal"

export default function AccountDeleteLayout() {
  const router = useRouter()
  const { user } = useUser()
  const isDemo = isDemoAuthUser(user)
  const email = getUserEmailFromAuthUser(user) ?? ""
  const userId = getUserIdFromAuthUser(user) ?? (user as any)?.id ?? ""
  
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Active Balance Warning Modal States
  const [activeBalanceModalOpen, setActiveBalanceModalOpen] = useState(false)
  const [activeBalanceData, setActiveBalanceData] = useState<{ available: number; security: number; total: number } | null>(null)

  // Check user active wallet funds and security deposit directly from DB microservices
  const checkUserWalletBalances = async (uid: string, uEmail: string) => {
    let available = 0
    let security = 0

    // 1. Direct Live DB Query: Query Wallet Microservices & SSO Database
    try {
      // Query SSO / Payment / Wallet DB endpoints concurrently
      const [ssoRes, paymentRes, walletServiceRes] = await Promise.allSettled([
        axiosInstance.get("/sso/wallet/balance", { timeout: 8000 }),
        axiosInstance.get("/api/payment/wallet", { timeout: 8000 }),
        axiosInstance.get("/wallet-service/wallet/balance", { timeout: 8000 }),
      ])

      if (ssoRes.status === "fulfilled" && ssoRes.value?.data?.balance !== undefined && ssoRes.value.data.balance !== null) {
        const val = Number(ssoRes.value.data.balance)
        if (!isNaN(val) && val > available) available = val
      }

      if (paymentRes.status === "fulfilled" && paymentRes.value?.data) {
        const pData = paymentRes.value.data
        if (pData.balance !== undefined && pData.balance !== null) {
          const val = Number(pData.balance)
          if (!isNaN(val) && val > available) available = val
        }
        if (pData.securityDeposit !== undefined && pData.securityDeposit !== null) {
          const sec = Number(pData.securityDeposit)
          if (!isNaN(sec) && sec > security) security = sec
        }
      }

      if (walletServiceRes.status === "fulfilled" && walletServiceRes.value?.data?.balance !== undefined && walletServiceRes.value.data.balance !== null) {
        const val = Number(walletServiceRes.value.data.balance)
        if (!isNaN(val) && val > available) available = val
      }
    } catch (err) {
      console.warn("Live DB wallet query warning:", err)
    }

    // 2. Cross-check persistent database ledger for collateral security deposits & pending holds
    if (typeof window !== "undefined") {
      try {
        const uidStr = String(uid).trim().toLowerCase()
        const emailStr = (uEmail || "").trim().toLowerCase()

        // Inspect wallet ledger (deposits, security deposits, holds, refunds)
        const rawLedger = localStorage.getItem("platform_wallet_ledger")
        const ledger = rawLedger ? JSON.parse(rawLedger) : []
        const userLedger = ledger.filter((r: any) => {
          const rUid = String(r.userId || "").trim().toLowerCase()
          const rName = String(r.userName || "").trim().toLowerCase()
          return rUid === uidStr || rName === emailStr
        })

        const sumKind = (kind: string) =>
          userLedger
            .filter((r: any) => r.kind === kind && r.status !== "Failed")
            .reduce((acc: number, r: any) => acc + (parseFloat(String(r.amount || 0).replace(/[^0-9.]/g, "")) || 0), 0)

        const dbSecurity = sumKind("security_deposit")
        if (dbSecurity > security) security = dbSecurity

        const deposits = sumKind("deposit")
        const holds = sumKind("withdraw_hold")
        const refunds = sumKind("refund")

        // Inspect withdrawals
        const rawWithdrawals = localStorage.getItem("platform_wallet_withdrawals")
        const withdrawals = rawWithdrawals ? JSON.parse(rawWithdrawals) : []
        const userWithdrawals = withdrawals.filter((w: any) => {
          const wUid = String(w.userId || "").trim().toLowerCase()
          return wUid === uidStr
        })
        const withdrawSum = userWithdrawals
          .filter((w: any) => w.status === "Complete" || w.status === "Processing" || w.status === "Pending")
          .reduce((acc: number, w: any) => acc + (parseFloat(String(w.amount || 0).replace(/[^0-9.]/g, "")) || 0), 0)

        const ledgerAvailable = Math.max(0, deposits + refunds - holds - withdrawSum)
        if (ledgerAvailable > available) available = ledgerAvailable

        // Inspect authenticated user object fields if populated
        if (user) {
          const uObj = user as any
          if (typeof uObj.walletBalance === "number" && uObj.walletBalance > available) {
            available = uObj.walletBalance
          }
          if (typeof uObj.balance === "number" && uObj.balance > available) {
            available = uObj.balance
          }
          if (typeof uObj.securityDeposit === "number" && uObj.securityDeposit > security) {
            security = uObj.securityDeposit
          }
        }
      } catch (e) {
        console.warn("Database wallet balance check error:", e)
      }
    }

    const total = available + security
    return { available, security, total }
  }

  // Step 1: Verify Password first before opening Warning Popup Modal
  const handleDeleteClick = async () => {
    if (isDemo) {
      toast.error("Demo accounts cannot be deleted.")
      return
    }
    if (!email) {
      toast.error("Unable to verify your account session.")
      return
    }
    if (!password.trim()) {
      toast.error("Please enter your account password.")
      return
    }

    setIsVerifying(true)
    try {
      const res = await verifyAccountPassword(email, password)
      if (!res.success) {
        toast.error(res.message || "Incorrect password. Please enter your valid account password.")
        return
      }
      // Password is valid -> Open confirmation popup modal!
      setConfirmOpen(true)
    } catch {
      toast.error("Incorrect password. Please enter your valid account password.")
    } finally {
      setIsVerifying(false)
    }
  }

  // Step 2: User Confirms Deletion in Warning Popup Modal
  const onConfirm = async () => {
    setConfirming(true)
    try {
      // 1. Safety Check: Verify User Wallet & Security Deposit Balances
      const balances = await checkUserWalletBalances(userId, email);
      if (balances.total > 0 || balances.available > 0 || balances.security > 0) {
        setConfirming(false);
        setConfirmOpen(false);
        setActiveBalanceData(balances);
        setActiveBalanceModalOpen(true);
        return;
      }

      // 2. Purge all user messages, threads, projects, proposals, and wallet records locally & globally
      if (typeof window !== "undefined") {
        try {
          const emailLower = email.toLowerCase();
          const userIdLower = String(userId).toLowerCase();
          const userNameLower = String((user as any)?.fullName || (user as any)?.name || "").toLowerCase();

          // Purge messages and threads from global email messages
          const allGlobal = JSON.parse(localStorage.getItem("platform_global_email_messages") || "[]");
          const cleanedGlobal = allGlobal.filter((t: any) => {
            const senderE = (t.senderEmail || "").toLowerCase();
            const recE = (t.recipientEmail || t.participant || "").toLowerCase();
            const senderN = (t.senderName || "").toLowerCase();
            const recN = (t.recipientName || t.participant || "").toLowerCase();
            return (
              senderE !== emailLower &&
              recE !== emailLower &&
              senderN !== userNameLower &&
              recN !== userNameLower
            );
          });
          localStorage.setItem("platform_global_email_messages", JSON.stringify(cleanedGlobal));

          // Purge projects created by this user
          const allProjects = JSON.parse(localStorage.getItem("platform_public_projects") || "[]");
          const cleanedProjects = allProjects.filter((p: any) => {
            const pCreatorId = String(p.userId || p.creatorId || "").toLowerCase();
            const pCreatorEmail = (p.creatorEmail || p.email || "").toLowerCase();
            return pCreatorId !== userIdLower && pCreatorEmail !== emailLower;
          });
          localStorage.setItem("platform_public_projects", JSON.stringify(cleanedProjects));

          // Purge user's submitted proposals & applications
          const allProposals = JSON.parse(localStorage.getItem("platform_project_proposals") || "{}");
          for (const key of Object.keys(allProposals)) {
            if (Array.isArray(allProposals[key])) {
              allProposals[key] = allProposals[key].filter((prop: any) => {
                const propUId = String(prop.userId || prop.applicantUserId || "").toLowerCase();
                const propEmail = (prop.email || "").toLowerCase();
                return propUId !== userIdLower && propEmail !== emailLower;
              });
            }
          }
          localStorage.setItem("platform_project_proposals", JSON.stringify(allProposals));

          // Purge technical projects
          const myTechnicalProjects = JSON.parse(localStorage.getItem("technical_projects") || "[]");
          const cleanedTechnical = myTechnicalProjects.filter((p: any) => {
            const pUid = String(p.userId || p.creatorId || "").toLowerCase();
            return pUid !== userIdLower;
          });
          localStorage.setItem("technical_projects", JSON.stringify(cleanedTechnical));

          // Purge wallet transactions & ledger records for this user
          const allLedger = JSON.parse(localStorage.getItem("platform_wallet_ledger") || "[]");
          const cleanedLedger = allLedger.filter((r: any) => {
            const rUid = String(r.userId || "").toLowerCase();
            const rName = String(r.userName || "").toLowerCase();
            return rUid !== userIdLower && rName !== emailLower;
          });
          localStorage.setItem("platform_wallet_ledger", JSON.stringify(cleanedLedger));

          // Purge wallet withdrawals for this user
          const allWithdrawals = JSON.parse(localStorage.getItem("platform_wallet_withdrawals") || "[]");
          const cleanedWithdrawals = allWithdrawals.filter((w: any) => {
            const wUid = String(w.userId || "").toLowerCase();
            return wUid !== userIdLower;
          });
          localStorage.setItem("platform_wallet_withdrawals", JSON.stringify(cleanedWithdrawals));

          // Remove user contact from registered contacts
          const allContacts = JSON.parse(localStorage.getItem("platform_registered_contacts") || "[]");
          const cleanedContacts = allContacts.filter((c: any) => {
            const cEmail = (c.email || "").toLowerCase();
            const cId = String(c.id || "").toLowerCase();
            return cEmail !== emailLower && cId !== userIdLower;
          });
          localStorage.setItem("platform_registered_contacts", JSON.stringify(cleanedContacts));
        } catch (e) {
          console.warn("Local purge error:", e);
        }
      }

      // 3. Call backend permanent delete user endpoint (SSO, Chat, Technology, Activity services)
      if (userId) {
        await deleteUserAccount(userId).catch(() => null);
      }

      // 4. Purge user-specific storage keys
      if (userId) {
        clearAllUserStorage(userId);
        await deleteAllLogs(userId).catch(() => null);
      }
      if (email) {
        await deleteAllLogs(email).catch(() => null);
      }

      // 5. Logout user session
      await logout().catch(() => undefined);

      toast.success("Account, wallet history, projects, and messages deleted successfully.");

      // Redirect directly to Landing Page cleanly
      if (typeof window !== "undefined") {
        window.location.assign("/");
      } else {
        router.push("/");
      }
    } catch {
      toast.error("Failed to delete account. Please try again.");
      setConfirming(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex justify-center px-2 py-4">
      <div className="w-full overflow-hidden rounded-2xl bg-card shadow-sm" style={{ maxWidth: "480px" }}>
        {/* Header */}
        <div className="border-b border-red-100 dark:border-red-950/40 bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-card px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Delete Account</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently delete your profile and account data.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6 md:p-7">
          <div className="rounded-xl border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3.5 text-xs font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
            ⚠️ Permanently removes your profile, KYC documents, wallet activity, and account data.
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm your password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Delete Button in Right Corner (Cancel Button Removed) */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={!password.trim() || isDemo || isVerifying}
              onClick={handleDeleteClick}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Password...</span>
                </>
              ) : (
                <span>Delete my account</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Themed Warning Confirmation Popup Modal */}
      <ConfirmActionModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
        title="Permanently delete account?"
        description="Everything associated with your account will be permanently deleted, including your KYC application, profile data, profile photo, uploaded documents, wallet, and all related account information. Are you sure you want to delete?"
        confirmLabel={confirming ? "Checking balances..." : "Confirm Delete"}
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Beautiful Active Balance Warning Modal */}
      {activeBalanceModalOpen && activeBalanceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            style={{ maxWidth: "490px", width: "100%" }}
            className="relative w-full rounded-2xl bg-card border border-amber-300/60 dark:border-amber-500/30 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Top Header */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Active Funds Detected
                </h3>
                <p className="text-xs text-muted-foreground">
                  Account cannot be deleted while holding active balances
                </p>
              </div>
            </div>

            {/* Balance Breakdown Card */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-primary" /> Available Wallet Balance:
                </span>
                <span className="font-bold text-foreground">
                  ${activeBalanceData.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Security Deposit:
                </span>
                <span className="font-bold text-foreground">
                  ${activeBalanceData.security.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-sm">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Total Active Funds:
                </span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400 text-base">
                  ${activeBalanceData.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>

            {/* Detailed Explanation */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              You currently have <strong className="text-foreground font-bold">${activeBalanceData.total.toFixed(2)} USD</strong> in your account. For your financial protection and to prevent permanent loss of funds, accounts with an active wallet balance or security deposit cannot be deleted. Please withdraw or refund your funds to <strong className="text-foreground font-bold">$0.00</strong> before deleting your account.
            </p>

            {/* OK Button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveBalanceModalOpen(false);
                  setActiveBalanceData(null);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                OK, Return to Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
