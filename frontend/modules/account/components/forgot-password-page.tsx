"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Mail, Smartphone, Key, ArrowLeft } from "lucide-react";
import { FormTextInput } from "@/src/components/form/form-text-input";
import { FormActions } from "@/src/components/form/FormActions";
import { Form } from "@/src/components/form/form";
import { AuthShell } from "./auth-shell";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "This field is required"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordPageProps {
  onNext: (email: string) => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordPage({ onNext, onBackToLogin }: ForgotPasswordPageProps) {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const [view, setView] = useState<'options' | 'email' | 'phone' | 'backup'>('email');

  const onSubmit = (data: ForgotPasswordFormValues) => {
    onNext(data.email);
  };

  if (view === 'options') {
    return (
      <AuthShell
        title="Recover Account"
        subtitle="Securely regain access to your dashboard."
        badge="Recovery"
      >
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Login
          </button>
        </div>

        <div className="space-y-4">
          <button onClick={() => setView('email')} className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Get a code via email</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">Receive a verification code at your registered email address.</p>
            </div>
          </button>
          
          <button onClick={() => setView('phone')} className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">Get a code via phone</h4>
              <p className="mt-0.5 text-sm text-muted-foreground">Receive a verification code via SMS to your registered phone.</p>
            </div>
          </button>

          <button onClick={() => setView('backup')} className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:bg-muted/50 hover:shadow-md">
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
          <button
            onClick={() => setView('email')}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </AuthShell>
    );
  }

  let label = "Email or phone";
  let placeholder = "you@company.com";
  let title = "Forgot password";
  let subtitle = "Enter your account email or phone to receive a reset code.";

  if (view === 'email') {
    label = "Email";
    title = "Account recovery";
    subtitle = "Enter your registered email to receive a reset code.";
  } else if (view === 'phone') {
    label = "Phone No";
    placeholder = "+61 400 000 000";
    title = "Account recovery";
    subtitle = "Enter your registered phone to receive a reset code.";
  } else if (view === 'backup') {
    label = "Enter backup code";
    placeholder = "Paste your recovery key here";
    title = "Backup Code";
    subtitle = "Enter the recovery key you saved when you created your account.";
  }

  return (
    <AuthShell
      title={view === 'backup' ? "Backup Code" : "Account recovery"}
      subtitle={view === 'backup' ? "Securely regain access using your recovery key." : "Reset your password securely. We'll send a verification code to your registered email or phone number."}
      badge="Password reset"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {view === 'email' ? (
            <Mail className="h-5 w-5" />
          ) : view === 'phone' ? (
            <Smartphone className="h-5 w-5" />
          ) : view === 'backup' ? (
            <Key className="h-5 w-5" />
          ) : (
            <KeyRound className="h-5 w-5" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              {label}
            </label>
            <div className="relative">
              <FormTextInput 
                control={form.control} 
                name="email" 
                placeholder={placeholder}
                type="text"
              />
            </div>
          </div>

          <FormActions submitLabel={view === 'backup' ? "Verify" : "Send reset code"} showCancel={false} />

          <div className="mt-5 flex flex-col items-center space-y-4 text-sm text-muted-foreground">
            <p>
              Remember your password?{" "}
              <button
                type="button"
                onClick={onBackToLogin}
                className="font-semibold text-primary hover:underline"
              >
                Back to sign in
              </button>
            </p>
            <button
              type="button"
              onClick={() => setView('options')}
              className="font-bold text-primary hover:underline transition-colors"
            >
              Try Another Way?
            </button>
          </div>
        </form>
      </Form>
    </AuthShell>
  );
}
