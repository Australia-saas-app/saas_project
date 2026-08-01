"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/src/context/user.provider";
import { Loader2 } from "lucide-react";
import { getDashboardRedirect } from "@/src/hooks/auth.hook";

export default function DashboardRootPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/account/user/login");
      return;
    }

    const role = (user as any)?.role || (user as any)?.accountType || "user";
    const redirectPath = getDashboardRedirect(role, (user as any)?.id);
    router.replace(redirectPath);
  }, [user, isLoading, router]);

  return (
    <div className="flex h-[70vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
