"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import DashboardVerificationGate from "@/src/shared/components/DashboardVerificationGate";
import { usePermission } from "@/src/hooks/permission.hook";
import AffiliaProBusinessShell from "@/src/modules/dashboard/business/components/AffiliaProBusinessShell";
import AffiliaProAffiliateShell from "@/src/modules/dashboard/affiliate/components/AffiliaProAffiliateShell";
import { SidebarResponsive as Sidebar } from "./sidebarResponsive";
import AccountSidebarChildren from "./AccountSidebarChildren";
import { DashboardTopBar } from "./DashboardTopBar";

function isBusinessPath(pathname: string) {
  return pathname.startsWith("/business") || pathname.startsWith("/dashboard/business");
}

function isAffiliatePath(pathname: string) {
  return pathname.startsWith("/affiliate") || pathname.startsWith("/dashboard/affiliate");
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isBusiness, isAffiliate } = usePermission();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(max-width: 1023px)");
    const syncMobile = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };

    syncMobile();
    mq.addEventListener("change", syncMobile);
    return () => mq.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isBusiness || isBusinessPath(pathname)) {
    return <AffiliaProBusinessShell>{children}</AffiliaProBusinessShell>;
  }

  if (isAffiliate || isAffiliatePath(pathname)) {
    return <AffiliaProAffiliateShell>{children}</AffiliaProAffiliateShell>;
  }

  // User Dashboard: Fixed open on desktop (isExpanded = true), slide-over drawer on mobile
  const isExpanded = !isMobile || mobileOpen;

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="flex h-full min-h-0 overflow-hidden">
        <Sidebar
          isExpanded={isExpanded}
          isMobile={isMobile}
          onCloseMobile={() => setMobileOpen(false)}
        >
          <AccountSidebarChildren
            isExpanded={isExpanded}
            isMobile={isMobile}
            onCloseMobile={() => setMobileOpen(false)}
          />
        </Sidebar>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <DashboardTopBar showMenuButton={isMobile} onOpenMenu={() => setMobileOpen(true)} />

          <main className="mx-4 min-h-0 min-w-0 flex-1 overflow-y-auto md:mx-8">
            <div className="min-w-0 p-4 md:pb-6 text-foreground">
              <DashboardVerificationGate>{children}</DashboardVerificationGate>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
