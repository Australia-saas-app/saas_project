"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, ChevronDown, User as UserIcon, Settings, LogOut } from "lucide-react";
import { usePermission } from "@/src/hooks/permission.hook";
import { NotificationBell } from "@/src/modules/shared/components/NotificationBell";
import { MessagesBell } from "@/src/modules/shared/components/MessagesBell";
import { ThemeToggle } from "@/src/shared/components/ThemeToggle";
import { useProfileDisplay } from "@/src/modules/dashboard/shared/hooks/use-profile-display";
import LogoutConfirmModal from "@/src/shared/components/LogoutConfirmModal";

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
  const { fullName, initials, avatarUrl } = useProfileDisplay();
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  let noticesHref = "/user/notifications";
  let messagesHref = "/dashboard/user/messages";
  let profileHref = "/user/profile";
  let settingsHref = "/user/settings";
  let roleSubtitle = "User Account";

  if (isAffiliate) {
    noticesHref = "/affiliate/notifications";
    messagesHref = "/dashboard/affiliate/messages";
    profileHref = "/affiliate/profile";
    settingsHref = "/affiliate/settings";
    roleSubtitle = "Affiliate Account";
  } else if (isBusiness) {
    noticesHref = "/business/notifications";
    messagesHref = "/dashboard/business/messages";
    profileHref = "/business/profile";
    settingsHref = "/business/settings";
    roleSubtitle = "Business Account";
  }

  return (
    <>
      <header className="relative z-50 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showMenuButton && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted lg:hidden cursor-pointer"
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
          <MessagesBell viewAllHref={messagesHref} />
          <NotificationBell viewAllHref={noticesHref} />

          {/* Profile Pill */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 pr-2 sm:pr-3 py-1 bg-card hover:bg-muted border border-border rounded-full transition-colors cursor-pointer shadow-xs"
            >
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-bold text-white shrink-0 overflow-hidden bg-primary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                <span className="text-xs sm:text-sm font-bold leading-tight max-w-[110px] truncate text-foreground">
                  {fullName}
                </span>
                <span className="text-[10px] capitalize leading-tight opacity-75 text-muted-foreground">
                  {roleSubtitle}
                </span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 opacity-60 transition-transform ${
                  profileOpen ? "rotate-180" : ""
                } ml-0.5 text-muted-foreground`}
              />
            </button>

            {profileOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close profile menu"
                  onClick={() => setProfileOpen(false)}
                />
                <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card py-1.5 shadow-xl text-foreground animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-border mb-1 sm:hidden">
                    <p className="text-xs font-bold text-foreground truncate">{fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{roleSubtitle}</p>
                  </div>
                  <Link
                    href={profileHref}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href={settingsHref}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    onClick={() => {
                      setProfileOpen(false);
                      setConfirmLogoutOpen(true);
                    }}
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Log out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <LogoutConfirmModal
        open={confirmLogoutOpen}
        onClose={() => setConfirmLogoutOpen(false)}
      />
    </>
  );
}
