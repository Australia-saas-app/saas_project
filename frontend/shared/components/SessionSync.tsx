"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/src/shared/server/AuthService";
import { useUser } from "@/src/context/user.provider";

export function SessionSync() {
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;

    const isDashboard = pathname.includes("/dashboard/");
    if (!user && !isDashboard) return;

    const bc = new BroadcastChannel("session-sync");

    const handleLock = (reason: "session_superseded" | "inactivity" = "session_superseded") => {
      window.location.href = `/?reason=${reason}`;
    };

    bc.onmessage = (event) => {
      if (event.data?.type === "LOGIN") {
        handleLock("session_superseded");
      }
    };

    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser && (user || isDashboard)) {
          handleLock("session_superseded");
        }
      } catch {
        // Ignore transient network errors during polling
      }
    };

    // Only poll after initial auth load — avoids false logout on hard refresh
    const pollInterval = setInterval(checkSession, 15000);

    return () => {
      bc.close();
      clearInterval(pollInterval);
    };
  }, [pathname, user, isLoading]);

  return null;
}
