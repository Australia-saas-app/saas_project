"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { setCookie } from "@/src/utils/cookie-utils";
import { useUser } from "@/src/context/user.provider";
import { getDashboardRedirect } from "@/src/shared/hooks/auth.hook";
import { resolvePostLoginRedirect } from "@/src/lib/auth-redirect";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useUser();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Read token from query parameters or URL hash (OAuth implicit flow)
        let token = searchParams.get("token") || searchParams.get("access_token");
        let accountType = searchParams.get("accountType") || searchParams.get("role") || "user";
        let redirect = searchParams.get("redirect");

        // Parse hash if query params didn't have token
        if (!token && typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          token = hashParams.get("access_token") || hashParams.get("id_token");
          const stateStr = hashParams.get("state");
          if (stateStr) {
            try {
              const parsedState = JSON.parse(decodeURIComponent(stateStr));
              if (parsedState.accountType) accountType = parsedState.accountType;
              if (parsedState.redirect) redirect = parsedState.redirect;
            } catch {
              // ignore state parse errors
            }
          }
        }

        if (!token) {
          setError("No authentication token received from identity provider.");
          return;
        }

        // Store session tokens
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", token);
          localStorage.setItem("token", token);
          setCookie("accessToken", token);
          setCookie("client_access_token", token);
          sessionStorage.setItem("show_login_success_toast", "true");

          const bc = new BroadcastChannel("session-sync");
          bc.postMessage({ type: "LOGIN", role: accountType });
          bc.close();
        }

        toast.success("Successfully authenticated with SSO");
        await refreshUser().catch(() => undefined);

        const targetUrl = resolvePostLoginRedirect(redirect, getDashboardRedirect(accountType));

        if (typeof window !== "undefined") {
          window.location.assign(targetUrl);
        } else {
          router.replace(targetUrl);
        }
      } catch (err: any) {
        console.error("SSO Callback Error:", err);
        setError(err?.message || "Failed to finalize social authentication.");
      }
    };

    handleAuthCallback();
  }, [searchParams, router, refreshUser]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-xl">
        {error ? (
          <div className="space-y-4">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Authentication Failed</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/account/user/login")}
              className="w-full mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Completing Sign In</h3>
            <p className="text-sm text-muted-foreground">
              Verifying your credentials and redirecting to your dashboard...
            </p>
            <div className="pt-2 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
