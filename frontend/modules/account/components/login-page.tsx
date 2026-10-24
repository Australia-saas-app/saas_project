"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldCheck, ArrowLeft, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { FormTextInput } from "@/src/components/form/form-text-input";
import { FormCheckbox } from "@/src/components/form/form-checkbox";
import { FormActions } from "@/src/components/form/FormActions";
import { Form } from "@/src/components/form/form";
import { ValidationSummary } from "@/src/components/form/ValidationSummary";
import { useUserLogin } from "@/src/hooks/auth.hook";
import { getLoginErrorMessage } from "@/src/lib/api-error";
import type { DashboardDemoAccountType } from "@/src/constants/demo-accounts";
import { AuthShell } from "./auth-shell";
import { AccountTypeTabs } from "./account-type-tabs";
import { UserStatusModal, type UserStatus } from "./UserStatusModal";
import { OtpInput } from "./OtpInput";
import { getSecuritySettings, saveSecuritySettings } from "@/src/shared/lib/security-settings-store";
import { verifyAccountPassword, sendRegistrationOtp, verifyRegistrationOtp } from "@/src/server/AuthService";
import { SessionExpiredLandingModal } from "@/src/shared/components/SessionExpiredLandingModal";
import { getOrCreateDeviceId } from "@/src/shared/lib/device-id";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email or phone is required")
    .refine((val) => {
      const isEmail = z.string().email().safeParse(val).success;
      const isPhone = val.replace(/\D/g, "").length >= 10;
      return isEmail || isPhone;
    }, "Provide a valid email or phone number"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  accountType?: DashboardDemoAccountType;
  onSignup: () => void;
  onAccountTypeChange: (type: DashboardDemoAccountType) => void;
  onForgotPassword?: () => void;
}

const LOGIN_TITLES: Record<DashboardDemoAccountType, string> = {
  user: "Welcome back",
  affiliate: "Affiliate sign in",
  business: "Business sign in",
};

export function LoginPage({
  accountType = "user",
  onSignup,
  onAccountTypeChange,
  onForgotPassword,
}: LoginPageProps) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const reason = searchParams.get("reason");
  const loginMutation = useUserLogin(redirect);

  const [showModalReason, setShowModalReason] = useState<string | null>(
    reason === "session_superseded" || reason === "inactivity" ? reason : null
  );

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (reason === "session_superseded" || reason === "inactivity") {
      setShowModalReason(reason);
    }
  }, [reason]);

  const [is2faStep, setIs2faStep] = useState(false);
  const [isNewDeviceStep, setIsNewDeviceStep] = useState(false);
  const [capturedIp, setCapturedIp] = useState<string | null>(null);
  const [pendingLoginData, setPendingLoginData] = useState<LoginFormValues | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(179);
  const [isVerifyingCreds, setIsVerifyingCreds] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema) as unknown as Resolver<LoginFormValues, unknown>,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Timer for 2FA OTP Resend
  useEffect(() => {
    if (!is2faStep && !isNewDeviceStep) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [is2faStep, isNewDeviceStep]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const sendOtp = async (userEmail: string, otpType: string = "2fa_login") => {
    if (isSendingOtp) return;
    setIsSendingOtp(true);
    setTimeLeft(179);
    try {
      const isPhone = !userEmail.includes("@");
      const payload = isPhone ? { phone: userEmail, type: otpType } : { email: userEmail, type: otpType };
      const res = await sendRegistrationOtp(payload);
      if (res && res.success !== false) {
        toast.success(`Verification code sent to ${userEmail}`);
      } else {
        toast.error(res?.message || `Failed to send verification code to ${userEmail}`);
      }
    } catch {
      toast.error(`Failed to send verification code to ${userEmail}`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    loginMutation.reset();
    setIsVerifyingCreds(true);

    const cleanEmail = (data.email || "").trim().toLowerCase();
    const normalizedData = { ...data, email: cleanEmail };

    try {
      // 1. Check credentials & backend DB 2FA setting
      const res = await verifyAccountPassword(normalizedData.email, normalizedData.password, accountType);
      if (!res.success) {
        toast.error(res.message || "Invalid credentials. Please check your email and password.");
        setIsVerifyingCreds(false);
        return;
      }

      // 2. Check 2FA setting directly from Database (DB)
      if (res.twoFactorEnabled) {
        setPendingLoginData(normalizedData);
        sendOtp(normalizedData.email, "2fa_login");
        setIs2faStep(true);
        setIsVerifyingCreds(false);
        return;
      }

      // 3. Perform login when 2FA is disabled
      const deviceId = getOrCreateDeviceId();

      setIsVerifyingCreds(false);
      loginMutation.mutate(
        { ...normalizedData, accountType, deviceId },
        {
          onError: (err: any) => {
            const errMsg = err?.message || "";
            if (errMsg.includes("mfa_required") || errMsg.includes("OTP required")) {
              setPendingLoginData(normalizedData);
              sendOtp(normalizedData.email, "2fa_login");
              setIs2faStep(true);
            }
            try {
              const parsed = JSON.parse(errMsg);
              if (parsed.type === "NEW_DEVICE") {
                setPendingLoginData(normalizedData);
                setCapturedIp(parsed.capturedIp);
                setIsNewDeviceStep(true);
                setTimeLeft(179);
                toast.success("New device detected. Verification code sent to email.");
              }
            } catch {
              // ignore
            }
          },
        }
      );
    } catch (err: any) {
      toast.error(err?.message || "Invalid credentials. Please check your email and password.");
      setIsVerifyingCreds(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    if (!pendingLoginData) {
      toast.error("Session expired. Please log in again.");
      setIs2faStep(false);
      setIsNewDeviceStep(false);
      return;
    }

    setIsVerifyingCreds(true);
    try {
      toast.success("OTP Verified Successfully");
      if (typeof window !== "undefined") {
        sessionStorage.setItem("show_login_success_toast", "true");
      }
      const deviceId = getOrCreateDeviceId();
      
      loginMutation.mutate(
        { ...pendingLoginData, otp: otpCode, accountType, deviceId },
        {
          onError: () => {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("show_login_success_toast");
            }
            setIsVerifyingCreds(false);
          },
        }
      );
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code. Please check your code and try again.");
      setIsVerifyingCreds(false);
    }
  };

  const loginError = loginMutation.isError ? getLoginErrorMessage(loginMutation.error) : null;
  
  let statusError: UserStatus | null = null;
  let displayError = loginError;
  
  if (loginMutation.isError && loginMutation.error?.message) {
    try {
      const parsed = JSON.parse(loginMutation.error.message);
      if (parsed.type === "STATUS_ERROR") {
        statusError = parsed.status;
        displayError = null;
      }
    } catch {
      // Ignore
    }
  }

  const handleAccountTypeChange = (type: DashboardDemoAccountType) => {
    onAccountTypeChange(type);
  };

  const isSubmitting = loginMutation.isPending || isVerifyingCreds;

  return (
    <AuthShell
      title="Your platform for growth"
      subtitle="Sign in to manage projects, earnings, wallet activity, and your professional profile from one secure dashboard."
      badge="Secure access"
    >

      {/* OTP Verification Step (Inline) */}
      {(is2faStep || isNewDeviceStep) ? (
        <div className="flex flex-col animate-in fade-in zoom-in-95 duration-200 w-full max-w-md mx-auto">
            <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
              <button
                type="button"
                onClick={() => {
                  setIs2faStep(false);
                  setIsNewDeviceStep(false);
                  setOtpCode("");
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground hover:bg-muted transition-all"
                title="Back to login"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {isNewDeviceStep ? "New Device Authentication" : "Two-Factor Authentication"}
                </h3>
                <p className="text-xs text-muted-foreground break-words">
                  {isNewDeviceStep && capturedIp && (
                    <span className="block mb-0.5 text-orange-500 font-medium">
                      Unrecognized IP: {capturedIp}
                    </span>
                  )}
                  Code sent to <span className="font-semibold text-foreground">{pendingLoginData?.email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify2fa} className="space-y-5">
              <div className="pt-1 w-full flex justify-center px-1">
                <OtpInput
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val);
                  }}
                  length={6}
                  disabled={loginMutation.isPending || isVerifyingCreds}
                />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  disabled={timeLeft > 0 || loginMutation.isPending || isSendingOtp}
                  onClick={() => {
                    if (pendingLoginData?.email) {
                      sendOtp(pendingLoginData.email, isNewDeviceStep ? "new_device" : "2fa_login");
                    }
                  }}
                  className="text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground transition-all"
                >
                  {timeLeft > 0 ? `Resend code in ${formatTime(timeLeft)}` : "Resend code"}
                </button>
              </div>

              <button
                type="submit"
                disabled={otpCode.length !== 6 || loginMutation.isPending}
                className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{loginMutation.isPending ? "Verifying & Signing in..." : "Verify & Sign in"}</span>
              </button>
            </form>
        </div>
      ) : (
      <>
          <div className="mb-2">
            <h3 className="hidden text-xl font-bold tracking-tight text-foreground lg:block">
              {LOGIN_TITLES[accountType]}
            </h3>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Choose your account type and sign in to continue.
            </p>
          </div>

          <AccountTypeTabs value={accountType} onChange={handleAccountTypeChange} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <ValidationSummary
                errors={form.formState.errors}
                labels={{ email: "Email or phone", password: "Password" }}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email or phone
                </label>
                <FormTextInput control={form.control} name="email" placeholder="you@company.com or phone (e.g. +18055525963)" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                <FormTextInput
                  control={form.control}
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <FormCheckbox control={form.control} name="rememberMe" label="Remember me" />
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-medium text-[#2563EB] hover:underline dark:text-primary"
                >
                  Forgot password?
                </button>
              </div>

              <FormActions
                submitLabel={isSubmitting ? "Signing in..." : "Sign in"}
                showCancel={false}
                isSubmitting={isSubmitting}
              />


              <p className="text-center text-sm text-muted-foreground pt-1">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={onSignup}
                  className="font-semibold text-[#2563EB] hover:underline dark:text-primary"
                >
                  Create account
                </button>
              </p>
            </form>
          </Form>

          <UserStatusModal 
            status={statusError} 
            onClose={() => loginMutation.reset()} 
          />
        </>
      )}

      {isMounted && showModalReason && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 overflow-y-auto">
          <div
            style={{ width: "360px", maxWidth: "calc(100vw - 32px)" }}
            className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <LogOut className="w-6 h-6 text-red-500" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Session Expired</h3>
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
              {showModalReason === "inactivity"
                ? "You have been logged out due to inactivity."
                : "You have been logged out because a new login was detected on another tab or device for this account role."}
            </p>
            <button 
              onClick={() => {
                setShowModalReason(null);
                // Remove 'reason' from URL
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('reason');
                  window.history.replaceState({}, '', url.toString());
                }
              }} 
              className="w-full font-semibold inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </AuthShell>
  );
}
