"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser } from "@/src/shared/server/AuthService";
import { useUser } from "@/src/context/user.provider";

export function SessionSync() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    // If the user is a public visitor on a non-dashboard page, do nothing.
    const isDashboard = pathname.includes("/dashboard/");
    if (!user && !isDashboard) return;

    const bc = new BroadcastChannel("session-sync");
    
    const handleLock = () => {
      setIsLocked(true);
      window.location.href = "/account/user/login?reason=session_superseded";
    };

    bc.onmessage = (event) => {
      if (event.data && event.data.type === "LOGIN") {
        handleLock();
      }
    };

    const checkSession = async () => {
      try {
        const currentUser = await getCurrentUser();
        // If they were authenticated (or in dashboard) but now are not, kick them out
        if (!currentUser) {
          handleLock();
        }
      } catch (err) {}
    };

    checkSession();
    const pollInterval = setInterval(checkSession, 15000);

    return () => {
      bc.close();
      clearInterval(pollInterval);
    };
  }, [pathname, user]);

  return null;
}
