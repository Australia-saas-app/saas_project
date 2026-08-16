"use client";

import Link from "next/link";
import { ExternalLink, Menu } from "lucide-react";
import { usePermission } from "@/src/hooks/permission.hook";
import { NotificationBell } from "@/src/modules/shared/components/NotificationBell";
import { ThemeToggle } from "@/src/shared/components/ThemeToggle";

type DashboardTopBarProps = {
  title?: string;
  onOpenMenu?: () => void;
  showMenuButton?: boolean;
};

export function DashboardTopBar({
  title = "Dashboard",
  onOpenMenu,
  showMenuButton = false,
}: DashboardTopBarProps) {
  const { isAffiliate, isBusiness } = usePermission();

  let noticesHref = "/user/notices";
  if (isAffiliate) {
    noticesHref = "/affiliate/notices";
  } else if (isBusiness) {
    noticesHref = "/business/notices";
  }

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {showMenuButton && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggle compact />
        <NotificationBell viewAllHref={noticesHref} />
        <Link
          href="/"
          target="_blank"
          className="hidden items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
        >
          View site
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}
