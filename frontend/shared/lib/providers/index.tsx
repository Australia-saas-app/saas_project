"use client";

import { Toaster, toast } from "sonner";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserProvider from "@/src/context/user.provider";
import { LocaleProvider } from "@/src/shared/context/locale.provider";
import { ThemeProvider } from "@/src/shared/context/theme.provider";
import { NotificationProvider } from "@/src/shared/context/notification.provider";
import { installGlobalErrorReporting } from "@/src/lib/error-reporter";
import { OfflineBanner } from "@/src/shared/components/OfflineBanner";

export interface ProvidersProps {
  children: React.ReactNode;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
          const status = (error as { status?: number })?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  try {
    Object.defineProperty(Document.prototype, "hidden", {
      get: () => false,
      configurable: true,
    });
    Object.defineProperty(Document.prototype, "visibilityState", {
      get: () => "visible",
      configurable: true,
    });
  } catch {}
}

export function Providers({ children }: ProvidersProps) {
  // useState keeps QueryClient off the Server→Client serialization boundary
  const [queryClient] = React.useState(getQueryClient);

  // Capture uncaught errors / unhandled rejections app-wide (idempotent).
  React.useEffect(() => {
    installGlobalErrorReporting();
  }, []);

  // Ensure toasts dismiss in the background and immediately vanish upon returning if expired
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const activeToastTimers = new Map<string | number, { createdAt: number; duration: number }>();

    const checkAndDismissExpired = () => {
      const now = Date.now();
      activeToastTimers.forEach(({ createdAt, duration }, id) => {
        if (now - createdAt >= duration) {
          activeToastTimers.delete(id);
          try {
            toast.dismiss(id);
          } catch {}
          try {
            const toastEls = document.querySelectorAll(`[data-sonner-toast]`);
            toastEls.forEach((el) => {
              if (el instanceof HTMLElement) {
                el.style.setProperty("display", "none", "important");
                el.remove();
              }
            });
          } catch {}
        }
      });
    };

    try {
      const unsubscribe = (toast as any).subscribe((toastItem: any) => {
        if (
          toastItem &&
          toastItem.id &&
          !toastItem.dismiss &&
          toastItem.type !== "loading" &&
          toastItem.duration !== Infinity
        ) {
          const duration = Number(toastItem.duration || 5000);
          activeToastTimers.set(toastItem.id, {
            createdAt: Date.now(),
            duration,
          });

          setTimeout(() => {
            activeToastTimers.delete(toastItem.id);
            try {
              toast.dismiss(toastItem.id);
            } catch {}
          }, duration);
        } else if (toastItem && toastItem.id && toastItem.dismiss) {
          activeToastTimers.delete(toastItem.id);
        }
      });

      document.addEventListener("visibilitychange", checkAndDismissExpired);
      window.addEventListener("focus", checkAndDismissExpired);
      const intervalId = setInterval(checkAndDismissExpired, 500);

      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
        document.removeEventListener("visibilitychange", checkAndDismissExpired);
        window.removeEventListener("focus", checkAndDismissExpired);
        clearInterval(intervalId);
      };
    } catch {}
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <LocaleProvider>
            <NotificationProvider>
              <Toaster 
                position="top-right" 
                duration={5000}
                toastOptions={{
                  classNames: {
                    toast: "group flex items-center w-full border shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-[12px] font-medium px-4 py-3.5 gap-3 bg-white border-gray-200 text-[#111] dark:bg-[#1c1c1e] dark:border-white/10 dark:!text-white dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
                    title: "text-[14px] font-bold text-[#111] dark:text-white",
                    description: "text-[13px] text-[#111] dark:text-white font-medium",
                  }
                }}
                icons={{
                  success: (
                    <svg
                      className="w-5 h-5 shrink-0 fill-[#1c1c1e] dark:fill-white"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  ),
                  error: <span className="hidden" />,
                }}
              />
              <OfflineBanner />
              {children}
            </NotificationProvider>
          </LocaleProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
