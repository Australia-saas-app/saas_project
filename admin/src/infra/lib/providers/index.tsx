"use client";

import { Toaster, toast } from "sonner";
import * as React from "react";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserProvider from "@/src/core/context/user.provider";
import { Provider } from "react-redux";
import { store } from "@/src/core/store/store";
import { useAppDispatch } from "@/src/core/store/hooks";
import { hydrate } from "@/src/core/store/slices/authSlice";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds — no refetch on page revisit within this window
      staleTime: 30 * 1000,
      // Keep cached data for 5 minutes after the component unmounts (background refetch on next visit)
      gcTime: 5 * 60 * 1000,
      // Don't refetch when the user switches browser tabs or windows
      refetchOnWindowFocus: false,
      // Only retry once on error instead of the default 3 times
      retry: 1,
    },
  },
});


function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    dispatch(hydrate());
  }, [dispatch]);

  return <>{children}</>;
}

import { NotificationProvider } from "@/src/shared/context/notification.provider";

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
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
                el.style.transition = "none";
                el.style.display = "none";
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
    <Provider store={store}>
      <HydrationWrapper>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <NotificationProvider>
              <Toaster position="top-right" richColors duration={5000} />

              {children}
            </NotificationProvider>
          </UserProvider>
        </QueryClientProvider>
      </HydrationWrapper>
    </Provider>
  );
}
