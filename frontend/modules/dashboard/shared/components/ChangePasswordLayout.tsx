"use client"

import React, { useState } from "react"
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { changeRegisteredPassword } from "@/src/server/AuthService"
import { isDemoAuthUser, getUserEmailFromAuthUser } from "@/src/shared/lib/demo-user"
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger"
export default function ChangePasswordLayout() {
  const { user } = useUser()
  const isDemo = isDemoAuthUser(user)
  const email = getUserEmailFromAuthUser(user) ?? ""
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [saving, setSaving] = useState(false)

  const passwordRequirements = [
    { label: "8+ chars", met: newPassword.length >= 8 },
    { label: "1 number", met: /[0-9]/.test(newPassword) },
    { label: "1 uppercase", met: /[A-Z]/.test(newPassword) },
    { label: "1 special", met: /[^A-Za-z0-9]/.test(newPassword) },
  ]

  const allReqsMet = passwordRequirements.every((r) => r.met)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isDemo) {
      toast.error("Demo account passwords are fixed for testing.")
      return
    }
    if (!email) {
      toast.error("Unable to resolve your account email.")
      return
    }
    if (!currentPassword) {
      toast.error("Please enter your current password.")
      return
    }
    if (!allReqsMet) {
      toast.error("Please meet all password requirements before changing password.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.")
      return
    }

    setSaving(true)
    try {
      const result = await changeRegisteredPassword({
        email,
        currentPassword,
        newPassword,
      })
      if (!result.success) {
        toast.error(result.message || "Current password is incorrect.")
        return
      }
      // Record Real Activity Log
      recordRealActivity("PASSWORD_CHANGED", "Account password updated successfully", { email, userId: (user as any)?.id, name: (user as any)?.fullName || (user as any)?.firstName || "User" });
      toast.success(result.message ?? "Password updated successfully.")
      // Clear fields upon successful password update
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error?.message || "Current password is incorrect.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex justify-center px-2 py-4">
      <div className="w-full rounded-2xl bg-card p-6 shadow-sm md:p-7" style={{ maxWidth: "480px" }}>
        <h3 className="text-lg font-bold text-foreground">Change Password</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Use at least 8 characters with a mix of letters and numbers.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* 1. Current Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full h-11 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 2. New Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full h-11 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password Requirements as simple inline row */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  {req.met ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span
                    className={
                      req.met
                        ? "font-medium text-emerald-600 dark:text-emerald-500"
                        : "text-muted-foreground"
                    }
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Confirm Password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button in Right Corner (No Cancel) */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving || !allReqsMet}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{saving ? "Changing password..." : "Change password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
