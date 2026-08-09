"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, Lock } from "lucide-react"

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

function getPasswordStrength(password: string) {
  if (!password) return { filled: 0, label: "" }

  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { filled: 2, label: "Weak" }
  if (score === 3) return { filled: 3, label: "Fair" }
  if (score === 4) return { filled: 4, label: "Good" }
  return { filled: 5, label: "Strong" }
}

interface PasswordFieldProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
}

function PasswordField({ placeholder, value, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-10 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#5D7293] focus:border-[#5D7293] bg-white"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

const ChangePasswordLayout = () => {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const form = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const newPassword = form.watch("newPassword")
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword])

  const onSubmit = async (data: PasswordForm) => {
    const { currentPassword, newPassword, confirmPassword } = data

    if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Please fill all fields and ensure passwords match." })
      return
    }

    if (currentPassword === newPassword) {
      setMessage({ type: "error", text: "New password must be different from old password." })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." })
      return
    }

    setSaving(true)
    setMessage(null)
    await new Promise((r) => setTimeout(r, 700))
    setSaving(false)
    setMessage({ type: "success", text: "Password changed successfully." })
    form.reset()
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Change Password</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Update passwords for enhanced account security
            </p>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <PasswordField
            placeholder="Current Password"
            value={form.watch("currentPassword")}
            onChange={(v) => form.setValue("currentPassword", v, { shouldDirty: true })}
          />

          <div>
            <PasswordField
              placeholder="New Password"
              value={form.watch("newPassword")}
              onChange={(v) => form.setValue("newPassword", v, { shouldDirty: true })}
            />
            {newPassword && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < strength.filled ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                {strength.label && (
                  <span className="text-xs font-medium text-green-600 shrink-0">{strength.label}</span>
                )}
              </div>
            )}
          </div>

          <PasswordField
            placeholder="Confirm New Password"
            value={form.watch("confirmPassword")}
            onChange={(v) => form.setValue("confirmPassword", v, { shouldDirty: true })}
          />

          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-red-50 text-red-700 border border-red-100"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#5D7293] hover:bg-[#4d6283] text-white font-medium py-2.5 rounded-md text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {saving ? "Changing..." : "Change My Password"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordLayout
