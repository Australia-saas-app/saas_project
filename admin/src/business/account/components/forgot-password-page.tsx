"use client"

import { useState, useEffect } from "react"
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

// Phase 2: OTP
const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be at least 6 digits"),
})

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

  // Forms
  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  })

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  })

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
      const res = await fetch(`${apiUrl}/auth/verify-email`, {
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

  const handleVerifyOTP = async (data: z.infer<typeof otpSchema>) => {
    if (data.otp === "456789") {
      toast.success("OTP Verified!")
      setPhase("reset")
    } else {
      toast.error("Invalid OTP")
    }
  }

  const handleResetPassword = async (data: z.infer<typeof passwordSchema>) => {
    setIsSubmitting(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      const res = await fetch(`${apiUrl}/auth/forgot-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifiedEmail, newPassword: data.newPassword })
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
    <Card className="w-full shadow-none bg-base-100 md:w-1/3 py-16 mx-auto border-2 border-border/50 relative">
      <button 
        onClick={onBackToLogin}
        className="absolute top-6 left-6 text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <CardHeader>
        <CardTitle className="text-2xl text-center font-bold">
          {phase === "email" && "Forgot Password"}
          {phase === "otp" && "Verify OTP"}
          {phase === "reset" && "Reset Password"}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-10">
        
        {/* PHASE 1: EMAIL */}
        {phase === "email" && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(handleVerifyEmail)} className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block">Email Address</label>
                <FormTextInput control={emailForm.control} name="email" placeholder="Enter your email" />
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
              </button>
            </form>
          </Form>
        )}

        {/* PHASE 2: OTP */}
        {phase === "otp" && (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleVerifyOTP)} className="space-y-6">
              <div className="text-center mb-6 text-sm text-slate-600">
                Enter the OTP sent to <span className="font-bold text-slate-900">{verifiedEmail}</span>
              </div>
              <div>
                <FormTextInput control={otpForm.control} name="otp" placeholder="Enter OTP (e.g. 456789)" />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Expire in: <span className="text-red-600 font-bold">{formatTime(timeLeft)}</span></span>
                <button 
                  type="button"
                  disabled={timeLeft > 0}
                  onClick={handleResendOTP}
                  className="font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                >
                  Resend OTP
                </button>
              </div>

              <button 
                type="submit" 
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center justify-center"
              >
                Submit OTP
              </button>
            </form>
          </Form>
        )}

        {/* PHASE 3: RESET PASSWORD */}
        {phase === "reset" && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-5">
              
              <div className="relative">
                <label className="text-sm font-semibold mb-2 block">New Password</label>
                <div className="relative">
                  <FormTextInput 
                    control={passwordForm.control} 
                    name="newPassword" 
                    type={showNewPassword ? "text" : "password"} 
                    placeholder="Enter new password" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="text-sm font-semibold mb-2 block">Confirm Password</label>
                <div className="relative">
                  <FormTextInput 
                    control={passwordForm.control} 
                    name="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm new password" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !passwordForm.formState.isValid}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center mt-4"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
              </button>
            </form>
          </Form>
        )}

      </CardContent>
    </Card>
  )
}
