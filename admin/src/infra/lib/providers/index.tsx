"use client";


import { Toaster } from "sonner";
import * as React from "react";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UserProvider from "@/src/core/context/user.provider";
import { Provider } from "react-redux";
import { store } from "@/src/core/store/store";
import { useAppDispatch } from "@/src/core/store/hooks";
import { hydrate } from "@/src/core/store/slices/authSlice";

const queryClient = new QueryClient();

function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    dispatch(hydrate());
  }, [dispatch]);

  return <>{children}</>;
}

export interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <HydrationWrapper>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <Toaster position="top-right" richColors duration={5000} />

            {children}
          </UserProvider>
        </QueryClientProvider>
      </HydrationWrapper>
    </Provider>
  );
}
