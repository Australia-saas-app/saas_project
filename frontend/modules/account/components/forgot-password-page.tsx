"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Mail, Smartphone, Key, ArrowLeft, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { FormTextInput } from "@/src/components/form/form-text-input";
import { FormActions } from "@/src/components/form/FormActions";
import { Form } from "@/src/components/form/form";
import { AuthShell } from "./auth-shell";
import { OtpInput } from "./OtpInput";
import { sendRegistrationOtp, verifyRegistrationOtp, verifyRecoveryKey, resetUserPassword } from "@/src/shared/server/AuthService";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";

const forgotPasswordSchema = z.object({
  inputValue: z.string().min(1, "This field is required"),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordPageProps {
  onNext: (email: string) => void;
  onBackToLogin: () => void;
  accountType?: string;
}

export function ForgotPasswordPage({ onBackToLogin, accountType }: ForgotPasswordPageProps) {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      inputValue: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [view, setView] = useState<'options' | 'email' | 'phone' | 'backup'>('email');

  // State for flow
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Input, 2: OTP/Verify, 3: Reset
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Recovery key user data
  const [userData, setUserData] = useState<{ fullName: string; email?: string; phone?: string; accountType?: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordValue = (form.watch("password") as string) || "";
  const passwordRequirements = [
    { label: "8+ chars", met: passwordValue.length >= 8 },
    { label: "1 number", met: /[0-9]/.test(passwordValue) },
    { label: "1 uppercase", met: /[A-Z]/.test(passwordValue) },
    { label: "1 special", met: /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const allReqsMet = passwordRequirements.every(r => r.met);
  const confirmPasswordValue = (form.watch("confirmPassword") as string) || "";
  const passwordsMatch = passwordValue && confirmPasswordValue && passwordValue === confirmPasswordValue;

  const handleSendOtp = async (inputValue: string) => {
    setIsSubmitting(true);
    const val = inputValue.trim();
    const isPhone = /^[0-9+\-\s()]+$/.test(val);
    const isEmail = val.includes("@");

    if (!isEmail && !isPhone) {
      toast.error("email format is not correct");
      setIsSubmitting(false);
      return;
    }

    const payload = isEmail ? { email: val, type: "forgot-password" } : { phone: val, type: "forgot-password" };
    const res = await sendRegistrationOtp(payload);

    setIsSubmitting(false);

    if (res?.success) {
      if (isEmail) {
        toast.success("OTP sent successfully");
      } else {
        toast.success("Verification code sent to your phone via SMS.");
      }
      setStep(2);
      setTimeLeft(179);
    } else {
      toast.error(res?.message || (isEmail ? "Email not Exists" : "Phone No not exists"));
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setIsSubmitting(true);
    const emailVal = form.getValues("inputValue").trim();
    const isEmail = emailVal.includes("@");
    const payload = isEmail
      ? { email: emailVal, otp: code, type: "forgot-password" }
      : { phone: emailVal, otp: code, type: "forgot-password" };

    const res = await verifyRegistrationOtp(payload);
    setIsSubmitting(false);

    if (res?.success) {
      toast.success("OTP Verified");
      setOtpVerified(true);
      setStep(3);
    } else {
      toast.error(res?.message || "Invalid OTP");
    }
  };

  const handleVerifyRecoveryKey = async () => {
    setIsSubmitting(true);
    const key = form.getValues("inputValue");
    const res = await verifyRecoveryKey(key);
    setIsSubmitting(false);

    if (res?.success && res.data) {
      toast.success("Recovery Key Verified");
      setUserData(res.data);
      setStep(3);
    } else {
      toast.error(res?.message || "Invalid backup Key");
    }
  };

  const handleResetPassword = async () => {
    if (!allReqsMet || !passwordsMatch) return;
    setIsSubmitting(true);
    const payload: any = { newPassword: passwordValue };

    if (view === 'backup') {
      payload.recoveryKey = form.getValues("inputValue");
    } else {
      const emailVal = form.getValues("inputValue").trim();
      if (emailVal.includes("@")) {
        payload.email = emailVal;
      } else {
        payload.phone = emailVal;
      }
      payload.otp = otp;
    }

    if (accountType) {
      payload.accountType = accountType;
    }

    const res = await resetUserPassword(payload);
    setIsSubmitting(false);

    if (res?.success) {
      toast.success("Password Reset Successfully");
      setTimeout(() => {
        onBackToLogin();
      }, 1500);
    } else {
      toast.error(res?.message || "Failed to reset password");
    }
  };

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    if (step === 1) {
      if (view === 'backup') {
        await handleVerifyRecoveryKey();
      } else if (view === 'email') {
        await handleSendOtp(data.inputValue);
      }
    } else if (step === 3) {
      await handleResetPassword();
    }
  };

  if (view === 'options') {
    return (
      <AuthShell title="Recover Account" subtitle="Securely regain access to your dashboard." badge="Recovery">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={onBackToLogin} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </button>
        </div>

        <div className="space-y-4">
          <button onClick={() => { setView('email'); setStep(1); form.reset(); }} className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Get a code via email</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">Receive a verification code at your registered email address.</p>
            </div>
          </button>

          <button onClick={() => { setView('phone'); setStep(1); form.reset(); }} className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Get a code via phone</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">Receive a verification code via SMS to your registered phone.</p>
            </div>
          </button>

          <button onClick={() => { setView('backup'); setStep(1); form.reset(); }} className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Use a backup code</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">Enter the recovery key you saved when you created your account.</p>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => setView('email')} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </AuthShell>
    );
  }

  let label = "Email";
  let placeholder = "you@company.com or phone (e.g. +18055525963)";
  let title = "Account recovery";
  let subtitle = "Enter your registered email or phone to receive a reset code.";

  if (view === 'phone') {
    label = "Phone No";
    placeholder = "e.g. +18055525963";
    subtitle = "Enter your registered phone to receive a reset code.";
  } else if (view === 'backup') {
    label = "Enter backup code";
    placeholder = "Paste your recovery key here";
    title = "Backup Code";
    subtitle = "Enter the recovery key you saved when you created your account.";
  }

  return (
    <AuthShell
      title={title}
      subtitle={subtitle}
      badge="Password reset"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {view === 'email' ? <Mail className="h-5 w-5" /> : view === 'phone' ? <Smartphone className="h-5 w-5" /> : view === 'backup' ? <Key className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {step === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
              <FormTextInput control={form.control} name="inputValue" placeholder={placeholder} type="text" />
              <div className="mt-4">
                <FormActions submitLabel={isSubmitting ? (view === 'backup' ? "Verifying..." : "Sending...") : (view === 'backup' ? "Verify Key" : "Send reset code")} showCancel={false} isSubmitting={isSubmitting} />
              </div>
            </div>
          )}

          {step === 2 && view !== 'backup' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-4 flex items-center justify-between">
                <button type="button" onClick={() => { setStep(1); setOtp(""); setOtpVerified(false); }} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              </div>

              <div className="mb-5 text-center sm:text-left">
                <label className="mb-1 block text-sm font-medium text-foreground">Verification Code</label>
                <p className="text-sm text-muted-foreground">
                  Sent to <span className="font-semibold text-foreground">{form.getValues("inputValue")?.toString()}</span>
                </p>
              </div>

              <OtpInput
                value={otp}
                onChange={(val: string) => { setOtp(val); if (val.length === 6) handleVerifyOtp(val); }}
                length={6}
                disabled={isSubmitting || otpVerified}
              />
              <div className="mt-3 text-center">
                <button type="button" disabled={timeLeft > 0 || isSubmitting} onClick={() => handleSendOtp(form.getValues("inputValue"))} className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground transition-colors">
                  {timeLeft > 0 ? `Resend code in ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">

              {userData && view === 'backup' && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4">
                  <p className="text-sm text-muted-foreground mb-1">Account Found</p>
                  <p className="font-semibold text-foreground">{userData.fullName}</p>
                  <p className="text-sm text-foreground">{userData.email || userData.phone}</p>
                  <p className="text-xs text-primary font-medium mt-1 uppercase tracking-wide">{userData.accountType}</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <FormTextInput control={form.control} name="password" type="password" placeholder="Minimum 8 characters" />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <FormTextInput control={form.control} name="confirmPassword" type="password" placeholder="Confirm password" />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-foreground mb-2">Password requirements:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      {req.met ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className={req.met ? "text-emerald-600 font-medium" : "text-muted-foreground"}>{req.label}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-xs">
                    {passwordsMatch ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                    <span className={passwordsMatch ? "text-emerald-600 font-medium" : "text-muted-foreground"}>Passwords match</span>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={!allReqsMet || !passwordsMatch || isSubmitting} className="w-full bg-primary hover:bg-primary/90 mt-4">
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          )}

          <div className="mt-5 flex flex-col items-center space-y-4 text-sm text-muted-foreground">
            <p>
              Remember your password?{" "}
              <button type="button" onClick={onBackToLogin} className="font-semibold text-primary hover:underline">
                Back to sign in
              </button>
            </p>
            {step === 1 && (
              <button type="button" onClick={() => { setView('options'); setStep(1); }} className="font-bold text-primary hover:underline transition-colors">
                Try Another Way?
              </button>
            )}
          </div>
        </form>
      </Form>
    </AuthShell>
  );
}
