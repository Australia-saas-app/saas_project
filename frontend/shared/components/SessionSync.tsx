"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { getCurrentUser } from "@/src/shared/server/AuthService";

export function SessionSync() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const bc = new BroadcastChannel("session-sync");
    
    const handleLock = () => {
      setIsLocked(true);
      window.location.href = "/login?reason=session_superseded";
    };

    bc.onmessage = (event) => {
      if (event.data && event.data.type === "LOGIN") {
        handleLock();
      }
    };

    const checkSession = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
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
  }, [pathname]);

  return null;
}
