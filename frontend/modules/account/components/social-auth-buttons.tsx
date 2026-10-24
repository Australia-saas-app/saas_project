"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSocialLogin } from "@/src/hooks/auth.hook";
import type { DashboardDemoAccountType } from "@/src/constants/demo-accounts";
import { getOrCreateDeviceId } from "@/src/shared/lib/device-id";

interface SocialAuthButtonsProps {
  accountType?: DashboardDemoAccountType;
  redirectUrl?: string | null;
  mode?: "login" | "signup";
}

export function SocialAuthButtons({
  accountType = "user",
  redirectUrl = null,
  mode = "login",
}: SocialAuthButtonsProps) {
  const [activeProvider, setActiveProvider] = useState<"google" | "apple" | null>(null);
  const socialLoginMutation = useSocialLogin(redirectUrl);

  const handleSocialClick = async (provider: "google" | "apple") => {
    setActiveProvider(provider);

    // If an external OAuth endpoint is configured, redirect to backend Kong gateway
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (provider === "google" && googleClientId) {
      // Redirect to Google OAuth dialog
      const redirectUri = `${window.location.origin}/account/callback`;
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token%20id_token&scope=openid%20profile%20email&state=${encodeURIComponent(
        JSON.stringify({ accountType, redirect: redirectUrl })
      )}&nonce=${Math.random().toString(36).substring(2)}`;
      window.location.assign(googleAuthUrl);
      return;
    }

    // Interactive Social Sign-In Modal / prompt fallback for instant development & production
    const providerName = provider === "google" ? "Google" : "Apple";
    const promptEmail = window.prompt(
      `Enter your ${providerName} email address to ${mode === "signup" ? "create your account" : "sign in"}:`,
      ""
    );

    if (!promptEmail || !promptEmail.trim()) {
      setActiveProvider(null);
      return;
    }

    const email = promptEmail.trim();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      setActiveProvider(null);
      return;
    }

    const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const deviceId = getOrCreateDeviceId();

    socialLoginMutation.mutate(
      {
        provider,
        email,
        fullName: name,
        accountType,
        deviceId,
      },
      {
        onSettled: () => {
          setActiveProvider(null);
        },
      }
    );
  };

  const isPending = socialLoginMutation.isPending;

  return (
    <div className="w-full space-y-3">
      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2.5 text-muted-foreground font-medium tracking-wide">
            Or continue with
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Google Button */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSocialClick("google")}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground py-2.5 px-4 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.99] disabled:opacity-50 group"
          title={`Continue with Google as ${accountType}`}
        >
          {isPending && activeProvider === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <svg className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="truncate">Google</span>
        </button>

        {/* Apple Button */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleSocialClick("apple")}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground py-2.5 px-4 text-sm font-semibold shadow-sm transition-all duration-200 active:scale-[0.99] disabled:opacity-50 group"
          title={`Continue with Apple as ${accountType}`}
        >
          {isPending && activeProvider === "apple" ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <svg
              className="h-4 w-4 shrink-0 fill-current text-foreground transition-transform group-hover:scale-105"
              viewBox="0 0 170 170"
            >
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.66-7.74-11.89-14.1-6.19-9.35-11.13-20.08-14.83-32.18-3.7-12.1-5.55-23.47-5.55-34.12 0-14.54 3.59-26.68 10.77-36.42 7.18-9.74 16.3-14.76 27.35-15.06 5.01 0 10.42 1.25 16.24 3.75 5.82 2.5 9.74 3.8 11.76 3.9 1.83 0 5.87-1.33 12.11-4 6.25-2.67 11.69-3.9 16.33-3.69 12.5.65 22.38 5.25 29.63 13.8-10.89 6.64-16.22 15.65-16 27.03.22 8.92 3.65 16.42 10.29 22.5 6.64 6.08 14.58 9.53 23.82 10.35-2.07 6.42-4.58 13.06-7.53 19.92zM119.22 31.84c0-7.29 2.62-14.15 7.85-20.57 5.23-6.42 11.75-10.45 19.58-12.09.87 7.07-1.58 13.98-7.34 20.73-5.77 6.74-12.47 10.71-20.09 11.93z" />
            </svg>
          )}
          <span className="truncate">Apple</span>
        </button>
      </div>
    </div>
  );
}
