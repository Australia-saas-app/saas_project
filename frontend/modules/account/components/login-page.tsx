"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
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
import { getSecuritySettings } from "@/src/shared/lib/security-settings-store";
import { verifyAccountPassword } from "@/src/server/AuthService";

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
  const loginMutation = useUserLogin(redirect);

  const [is2faStep, setIs2faStep] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<LoginFormValues | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState("123456");
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
    if (!is2faStep) return;
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
  }, [is2faStep]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sendOtp = (userEmail: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setTimeLeft(179);
    toast.success(`Verification code sent to ${userEmail}`);
  };

  const onSubmit = async (data: LoginFormValues) => {
    loginMutation.reset();
    setOtpError(null);

    const security = getSecuritySettings();

    // If 2FA is enabled in Account Security
    if (security.twoFactorEnabled) {
      setIsVerifyingCreds(true);
      try {
        // First verify if email and password are correct
        await verifyAccountPassword(data.email, data.password);
        // Password is correct -> trigger 2FA OTP step!
        setPendingLoginData(data);
        sendOtp(data.email);
        setIs2faStep(true);
      } catch (err: any) {
        toast.error(err?.message || "Invalid credentials. Please check your email and password.");
      } finally {
        setIsVerifyingCreds(false);
      }
      return;
    }

    // Simple login when 2FA is disabled
    loginMutation.mutate({ ...data, accountType });
  };

  const handleVerify2fa = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (otpCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code");
      return;
    }

    // Verify OTP matching (or demo fallback)
    if (otpCode === generatedOtp || otpCode === "123456") {
      if (pendingLoginData) {
        loginMutation.mutate({ ...pendingLoginData, accountType });
      }
    } else {
      setOtpError("Invalid verification code. Please check your code and try again.");
      toast.error("Invalid verification code");
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
      {is2faStep ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <button
              type="button"
              onClick={() => {
                setIs2faStep(false);
                setOtpCode("");
                setOtpError(null);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/30 text-foreground hover:bg-muted transition-all"
              title="Back to login"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Two-Factor Authentication</h3>
              <p className="text-xs text-muted-foreground">
                Code sent to <span className="font-semibold text-foreground">{pendingLoginData?.email}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleVerify2fa} className="space-y-5">
            <div className="pt-1">
              <OtpInput
                value={otpCode}
                onChange={(val) => {
                  setOtpError(null);
                  setOtpCode(val);
                }}
                length={6}
                disabled={loginMutation.isPending}
              />
            </div>

            {otpError && (
              <p className="text-center text-xs font-semibold text-red-600 dark:text-red-400">
                {otpError}
              </p>
            )}

            <div className="text-center">
              <button
                type="button"
                disabled={timeLeft > 0 || loginMutation.isPending}
                onClick={() => {
                  if (pendingLoginData?.email) {
                    sendOtp(pendingLoginData.email);
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
                <FormTextInput control={form.control} name="email" placeholder="you@company.com" />
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

              <p className="text-center text-sm text-muted-foreground">
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
    </AuthShell>
  );
}
