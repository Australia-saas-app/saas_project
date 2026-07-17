"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/shared/ui/ui/card"
import { FormTextInput } from "@/src/shared/ui/form/form-text-input"
import { Form } from "@/src/shared/ui/form/form"
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

// Phase 1: Email
const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
})

// Phase 2: OTP - handled with individual digit state (no zod schema needed)

// Phase 3: Password
const passwordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least 1 uppercase letter")
    .regex(/[a-z]/, "Must contain at least 1 lowercase letter")
    .regex(/[0-9]/, "Must contain at least 1 number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least 1 special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

interface ForgotPasswordPageProps {
  onBackToLogin: () => void;
  onNext?: (email: string) => void;
  onSuccess?: () => void;
}

export function ForgotPasswordPage({ onBackToLogin, onNext, onSuccess }: ForgotPasswordPageProps) {
  const [phase, setPhase] = useState<"email" | "otp" | "reset">("email")
  const [verifiedEmail, setVerifiedEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // OTP digit state (6 boxes)
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Forms
  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })

  // OTP form removed - using otpDigits state directly

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
    mode: "onChange"
  })

  // Timer logic for OTP phase
  useEffect(() => {
    if (phase !== "otp" || timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [phase, timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleVerifyEmail = async (data: z.infer<typeof emailSchema>) => {
    setIsSubmitting(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiUrl}/sso/auth/admin/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      })
      const result = await res.json()
      
      if (result.success) {
        setVerifiedEmail(data.email)
        setPhase("otp")
        setTimeLeft(180)
        toast.success("OTP sent to your email")
      } else {
        toast.error("Email not exists")
      }
    } catch (err) {
      toast.error("Failed to verify email")
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleResetPassword = async (data: z.infer<typeof passwordSchema>) => {
    setIsSubmitting(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiUrl}/sso/auth/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifiedEmail, otp: otpDigits.join(""), newPassword: data.newPassword })
      })
      const result = await res.json()
      
      if (result.success) {
        toast.success("Password Reset successfully")
        onBackToLogin()
      } else {
        toast.error(result.message || "Failed to reset password")
      }
    } catch (err) {
      toast.error("Failed to reset password")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendOTP = () => {
    setTimeLeft(180)
    toast.success("OTP Resent!")
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[85vh]">
      <div className="relative w-full px-4" style={{ maxWidth: '480px' }}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden relative">
          
          <button 
            onClick={onBackToLogin}
            className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800 text-center mt-6 md:mt-0">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
              {phase === "email" && "Forgot Password"}
              {phase === "otp" && "Verify OTP"}
              {phase === "reset" && "Reset Password"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {phase === "email" && "Enter your email to receive a recovery code"}
              {phase === "otp" && "Enter the 6-digit code sent to your email"}
              {phase === "reset" && "Create a new strong password for your account"}
            </p>
          </div>

          <div className="p-8 pt-10">
        
        {/* PHASE 1: EMAIL */}
        {phase === "email" && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleVerifyEmail)} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Email Address</label>
                <div className="transition-all duration-200 focus-within:scale-[1.02]">
                  <FormTextInput 
                    control={emailForm.control} 
                    name="email" 
                    placeholder="Enter your email" 
                    className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-center">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-md bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Email"}
                </button>
              </div>
            </form>
          </Form>
        )}

        {/* PHASE 2: OTP */}
        {phase === "otp" && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                Enter the 6-digit code sent to<br/>
                <span className="font-bold text-slate-900 dark:text-white">{verifiedEmail}</span>
              </p>

              <div className="flex justify-center gap-2 mb-5">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    value={digit}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length > 1) return;
                      const newDigits = [...otpDigits];
                      newDigits[index] = val;
                      setOtpDigits(newDigits);
                      if (val !== "" && index < 5) otpRefs.current[index + 1]?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && otpDigits[index] === "" && index > 0) {
                        otpRefs.current[index - 1]?.focus();
                      }
                    }}
                    className="w-11 h-13 text-center text-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                    style={{ height: "3rem" }}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center text-xs px-1">
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {timeLeft > 0 ? `Expires in ${formatTime(timeLeft)}` : "Expired"}
                </span>
                <button
                  type="button"
                  disabled={timeLeft > 0}
                  onClick={handleResendOTP}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-40 transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <button
                type="button"
                disabled={isSubmitting || otpDigits.join("").length < 6}
                onClick={() => {
                  const code = otpDigits.join("");
                  if (code.length === 6) {
                    setPhase("reset");
                  } else {
                    toast.error("Please enter a 6-digit OTP");
                  }
                }}
                className="w-full py-2.5 rounded-md bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: RESET PASSWORD */}
        {phase === "reset" && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">New Password</label>
                <div className="relative transition-all duration-200 focus-within:scale-[1.02]">
                  <FormTextInput 
                    control={passwordForm.control} 
                    name="newPassword" 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="Enter new password" 
                    className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium tracking-widest pr-10"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="text-[10px] font-medium text-slate-500 flex flex-wrap gap-x-2.5 gap-y-1">
                <span className={passwordForm.watch("newPassword")?.length >= 8 ? "text-emerald-600" : ""}>• 8+ chars</span>
                <span className={/[A-Z]/.test(passwordForm.watch("newPassword") || "") ? "text-emerald-600" : ""}>• 1 uppercase</span>
                <span className={/[a-z]/.test(passwordForm.watch("newPassword") || "") ? "text-emerald-600" : ""}>• 1 lowercase</span>
                <span className={/\d/.test(passwordForm.watch("newPassword") || "") ? "text-emerald-600" : ""}>• 1 number</span>
                <span className={/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(passwordForm.watch("newPassword") || "") ? "text-emerald-600" : ""}>• 1 special</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Confirm Password</label>
                <div className="relative transition-all duration-200 focus-within:scale-[1.02]">
                  <FormTextInput 
                    control={passwordForm.control} 
                    name="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm new password" 
                    className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium tracking-widest pr-10"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-center">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !passwordForm.formState.isValid}
                  className="w-full py-2.5 rounded-md bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
                </button>
              </div>
            </form>
          </Form>
        )}

          </div>
        </div>
      </div>
    </div>
  )
}
