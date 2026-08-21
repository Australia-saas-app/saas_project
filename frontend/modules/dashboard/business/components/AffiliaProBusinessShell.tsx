"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp, LayoutGrid, LogOut, Menu, Settings, X } from "lucide-react";
import DashboardVerificationGate from "@/src/shared/components/DashboardVerificationGate";
import LogoutConfirmModal from "@/src/shared/components/LogoutConfirmModal";
import { useUser } from "@/src/context/user.provider";
import { useLogout } from "@/src/hooks/auth.hook";
import { NotificationBell } from "@/src/modules/shared/components/NotificationBell";
import { MessagesBell } from "@/src/modules/shared/components/MessagesBell";
import { ThemeToggle } from "@/src/shared/components/ThemeToggle";
import { AFFILIAPRO_NAV_GROUPS } from "../constants/affiliapro-nav";
import { useProfileDisplay } from "@/src/modules/dashboard/shared/hooks/use-profile-display";
import { ChevronDown } from "lucide-react";

const PRIMARY = "#6366F1";

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href.endsWith("/dashboard")) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function displayNameFromUser(user: ReturnType<typeof useUser>["user"], isLoading: boolean) {
  if (isLoading) return "Loading...";
  if (!user) return "TechWorld Solutions";
  if ("name" in user && user.name) return String(user.name);
  if ("firstName" in user && user.firstName) {
    return `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim();
  }
  return user.email?.split("@")[0] || "Business Account";
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "T";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function AffiliaProBusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  const logoutMutation = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const { fullName, initials, avatarUrl } = useProfileDisplay();

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
    // Exact matches (Dashboard) win first
    for (const group of AFFILIAPRO_NAV_GROUPS) {
      for (const item of group.items) {
        if (item.exact && isNavActive(normalizedPath, item.href, true)) {
          return item;
        }
      }
    }
    // Then first (top-to-bottom) item whose href matches the current path
    for (const group of AFFILIAPRO_NAV_GROUPS) {
      for (const item of group.items) {
        if (item.exact) continue;
        if (isNavActive(normalizedPath, item.href, false)) {
          return item;
        }
      }
    }
    return null;
  }, [normalizedPath]);

  const sidebar = (
    <aside className="flex h-full w-[260px] flex-col border-r border-border bg-card">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: PRIMARY }}
          aria-hidden
        >
          <LayoutGrid className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold tracking-tight text-foreground">AffiliaPro</p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">Business Account</p>
        </div>
        <button
          type="button"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {AFFILIAPRO_NAV_GROUPS.map((group) => (
          <div key={group.id} className={group.label ? "mt-4 first:mt-0" : "first:mt-0"}>
            {group.label && (
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const showActive =
                  activeItem?.label === item.label && activeItem.href === item.href;

                return (
                  <li key={`${group.id}-${item.label}`}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        showActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${showActive ? "text-white" : "text-muted-foreground"}`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-[260px] shadow-xl">{sidebar}</div>
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-50 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-semibold text-foreground">Business Account</p>
              <p className="truncate text-[11px] text-muted-foreground">AffiliaPro Partner Portal</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle compact />
            <MessagesBell viewAllHref="/dashboard/business/messages" />
            <NotificationBell viewAllHref="/business/notices" />

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
                    Business Account
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
                  <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg text-foreground">
                    <Link
                      href="/business/profile"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Business Profile
                    </Link>
                    <Link
                      href="/business/settings"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Settings
                    </Link>
                    <Link
                      href="/business/notices"
                      className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-muted"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      Notices
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
