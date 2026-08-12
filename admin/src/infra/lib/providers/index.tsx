"use client";


import { Toaster } from "sonner";
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
