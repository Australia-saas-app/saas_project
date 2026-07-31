"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { logout, verifyAccountPassword } from "@/src/server/AuthService"
import {
  getUserEmailFromAuthUser,
  getUserIdFromAuthUser,
  isDemoAuthUser,
} from "@/src/shared/lib/demo-user"
import { clearAllUserStorage } from "@/src/shared/utils/profile-storage"
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
      // Call backend permanent delete user endpoint
      const res = await fetch(`/sso/auth/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }).catch(() => null)

      // Purge all local storage and browser caches for user
      if (userId) {
        clearAllUserStorage(userId)
      }
      if (typeof window !== "undefined") {
        localStorage.clear()
      }

      // Logout user session
      await logout().catch(() => undefined)

      toast.success("Account deleted successfully")

      // Redirect directly to Landing Page cleanly
      if (typeof window !== "undefined") {
        window.location.assign("/")
      } else {
        router.push("/")
      }
    } catch {
      toast.error("Failed to delete account. Please try again.")
      setConfirming(false)
      setConfirmOpen(false)
    }
  }

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
        confirmLabel={confirming ? "Deleting account..." : "Confirm Delete"}
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  )
}
