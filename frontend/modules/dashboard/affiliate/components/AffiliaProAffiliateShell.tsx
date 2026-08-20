"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Crown, Globe, LayoutGrid, LogOut, Menu, Settings, X } from "lucide-react";
import DashboardVerificationGate from "@/src/shared/components/DashboardVerificationGate";
import LogoutConfirmModal from "@/src/shared/components/LogoutConfirmModal";
import { useUser } from "@/src/context/user.provider";
import { useLogout } from "@/src/hooks/auth.hook";
import { NotificationBell } from "@/src/modules/shared/components/NotificationBell";
import { MessagesBell } from "@/src/modules/shared/components/MessagesBell";
import { ThemeToggle } from "@/src/shared/components/ThemeToggle";
import { AFFILIAPRO_AFFILIATE_NAV } from "../constants/affiliapro-nav";
import { useProfileDisplay } from "@/src/modules/dashboard/shared/hooks/use-profile-display";

const PRIMARY = "#6366F1";

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AffiliaProAffiliateShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const { fullName, initials, status, avatarUrl } = useProfileDisplay();
  const isComplete = status === "active" || status === "verified" || status === "approved";

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => {
      if (!mq.matches) setMobileOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const normalizedPath = pathname.replace(/^\/dashboard/, "") || pathname;

  const activeItem = useMemo(() => {
    if (normalizedPath.startsWith("/affiliate/settings/")) {
      return AFFILIAPRO_AFFILIATE_NAV.find((i) => i.label === "Security") ?? null;
    }

    let best: (typeof AFFILIAPRO_AFFILIATE_NAV)[number] | null = null;
    let bestScore = -1;
    for (const item of AFFILIAPRO_AFFILIATE_NAV) {
      if (item.exact) {
        if (isNavActive(normalizedPath, item.href, true) && bestScore < 10_000) {
          best = item;
          bestScore = 10_000;
        }
        continue;
      }
      if (isNavActive(normalizedPath, item.href, false)) {
        const score = item.href.length;
        if (score > bestScore) {
          best = item;
          bestScore = score;
        }
      }
    }
    return best;
  }, [normalizedPath]);

  const sidebar = (
    <aside className="flex h-full w-[250px] flex-col border-r border-gray-100 bg-white">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-gray-100 px-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: PRIMARY }}
          aria-hidden
        >
          <LayoutGrid className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold tracking-tight text-gray-900">AffiliaPro</p>
          <p className="truncate text-[11px] font-medium text-gray-400">Affiliate Portal</p>
        </div>
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {AFFILIAPRO_AFFILIATE_NAV.map((item) => {
            const Icon = item.icon;
            const showActive = activeItem?.label === item.label && activeItem.href === item.href;
            const isDisabled = !isComplete && item.href !== "/affiliate/profile";

            if (isDisabled) {
              return (
                <li key={item.label}>
                  <div
                    title="Account not active"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors opacity-45 cursor-not-allowed select-none bg-transparent text-gray-500"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-50" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </li>
              );
            }

            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    showActive
                      ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/20"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${showActive ? "text-white" : "text-gray-400"}`}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 p-3">
        <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-100 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <Crown className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold text-gray-900">Get Premium Benefits</p>
          <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
            Unlock higher commissions, priority payouts, and exclusive offers.
          </p>
          <Link
            href="/affiliate/promotions"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-600"
            onClick={() => setMobileOpen(false)}
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background">
      <div className="hidden lg:block">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-gray-900/40"
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-[250px] shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <header className="relative z-50 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-50 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 sm:block lg:hidden">
              <p className="text-sm font-bold text-gray-900">AffiliaPro</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle compact />
            <MessagesBell viewAllHref="/dashboard/affiliate/messages" />
            <NotificationBell viewAllHref="/affiliate/notices" />

            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 pr-2 sm:pr-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 rounded-full transition-colors"
              >
                <div
                  className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-sm font-bold text-white shrink-0 overflow-hidden"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-xs sm:text-sm font-bold leading-tight max-w-[90px] truncate text-gray-900">
                    {fullName}
                  </span>
                  <span className="text-[10px] capitalize leading-tight opacity-75 text-gray-500">
                    Affiliate
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform ${profileOpen ? "rotate-180" : ""} ml-0.5 text-gray-500`} />
              </button>

              {profileOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close profile menu"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                    <Link
                      href="/affiliate/profile"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Profile
                    </Link>
                    <Link
                      href="/affiliate/settings"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-gray-400" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setProfileOpen(false);
                        setConfirmLogoutOpen(true);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      {logoutMutation.isPending ? "Signing out..." : "Logout"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <div className="min-w-0 px-4 py-5 text-foreground md:px-6 md:pb-8">
            <DashboardVerificationGate>{children}</DashboardVerificationGate>
          </div>
        </main>
      </div>

      <LogoutConfirmModal 
        open={confirmLogoutOpen} 
        onClose={() => setConfirmLogoutOpen(false)} 
      />
    </div>
  );
}
