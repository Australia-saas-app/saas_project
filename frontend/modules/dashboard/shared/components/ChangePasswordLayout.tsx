"use client"

import React, { useState } from "react"
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { changeRegisteredPassword } from "@/src/server/AuthService"
import { isDemoAuthUser, getUserEmailFromAuthUser } from "@/src/shared/lib/demo-user"

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
      toast.success(result.message ?? "Password updated successfully.")
      // Clear fields upon successful password update
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error?.message || "Failed to change password. Please check your current password.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex justify-center px-4 py-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-foreground">Change Password</h3>
            <p className="text-xs text-gray-500 dark:text-muted-foreground mt-0.5">
              Update your account password securely.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Current Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* 2. New Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Password Requirements Green Ticks */}
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-3.5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Password Requirements:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {passwordRequirements.map((req, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  {req.met ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                  <span
                    className={
                      req.met
                        ? "font-semibold text-emerald-600 dark:text-emerald-500"
                        : "text-slate-500 dark:text-slate-400"
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-gray-900 dark:text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button (Cancel Removed) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !allReqsMet}
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{saving ? "Changing Password..." : "Change Password"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
