"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/src/context/user.provider";
import { useLogout } from "@/src/hooks/auth.hook";
import { usePermission } from "@/src/hooks/permission.hook";
import { useLocale } from "@/src/shared/context/locale.provider";
import {
  X,
  Wallet,
  Activity,
  LayoutDashboard,
  Briefcase,
  FileText,
  ArrowLeftRight,
  ShoppingBag,
  Bell,
  MessageSquare,
  Package,
  Users,
  Link2,
  TrendingUp,
  Code2,
  RotateCcw,
  User,
  LayoutGrid,
} from "lucide-react";
import { formatAccountIdLabel } from "@/src/shared/lib/demo-user";
import UserAccountMenu from "./UserAccountMenu";
import { isProfileComplete } from "@/src/shared/lib/profile-completion";
import { getUserIdFromAuthUser } from "@/src/shared/lib/demo-user";
import { useProfileDisplay } from "../hooks/use-profile-display";

interface SidebarProps {
  isExpanded?: boolean;
  isMobile?: boolean;
  onCloseMobile: () => void;
}

export function AccountSidebarChildren({
  isExpanded = true,
  isMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, isLoading } = useUser();
  const { isAffiliate, isBusiness } = usePermission();
  const { t } = useLocale();
  const logoutMutation = useLogout();
  const { avatarUrl, isVerified } = useProfileDisplay();

  let dashboardPrefix = "/user";
  if (isAffiliate) {
    dashboardPrefix = "/affiliate";
  } else if (isBusiness) {
    dashboardPrefix = "/business";
  }

  const userId = getUserIdFromAuthUser(user);
  const userStatus = String((user as any)?.status ?? "").toLowerCase();
  const isComplete =
    isProfileComplete(userId) ||
    isVerified ||
    userStatus === "active" ||
    userStatus === "verified" ||
    userStatus === "approved";

  const menuItems = !isAffiliate && !isBusiness
    ? [
        { label: t.dashboard.user.dashboard, icon: LayoutDashboard, href: `${dashboardPrefix}/dashboard` },
        { label: t.dashboard.user.profile, icon: User, href: `${dashboardPrefix}/profile` },
        { label: t.dashboard.user.wallet, icon: Wallet, href: `${dashboardPrefix}/wallet` },
        { label: t.dashboard.user.earnings, icon: Activity, href: `${dashboardPrefix}/earnings` },
        { label: t.dashboard.user.orders, icon: Package, href: `${dashboardPrefix}/orders` },
        { label: "Returns", icon: RotateCcw, href: `${dashboardPrefix}/returns` },
        { label: t.dashboard.user.applications, icon: FileText, href: `${dashboardPrefix}/applications` },
        { label: t.dashboard.user.technical, icon: Code2, href: `${dashboardPrefix}/technical` },
        { label: t.dashboard.user.notices, icon: Bell, href: `${dashboardPrefix}/notices` },
        { label: t.dashboard.user.marketplace, icon: ShoppingBag, href: `${dashboardPrefix}/marketplace` },
        { label: t.dashboard.user.messages, icon: MessageSquare, href: `${dashboardPrefix}/messages` },
      ]
    : isBusiness
      ? [
          { label: t.business.sidebar.dashboard, icon: LayoutDashboard, href: `${dashboardPrefix}/dashboard` },
          { label: t.business.sidebar.wallet, icon: Wallet, href: `${dashboardPrefix}/wallet` },
          { label: t.business.sidebar.services, icon: Briefcase, href: `${dashboardPrefix}/services` },
          { label: t.business.sidebar.transaction, icon: ArrowLeftRight, href: `${dashboardPrefix}/transaction` },
          { label: "Returns", icon: RotateCcw, href: `${dashboardPrefix}/returns` },
          { label: t.business.sidebar.clients, icon: Users, href: `${dashboardPrefix}/clients` },
          { label: t.business.sidebar.technical, icon: Code2, href: `${dashboardPrefix}/technical` },
          { label: t.business.sidebar.notices, icon: Bell, href: `${dashboardPrefix}/notices` },
          { label: t.business.sidebar.messages, icon: MessageSquare, href: `${dashboardPrefix}/messages` },
        ]
      : [
          { label: t.dashboard.affiliate.dashboard, icon: LayoutDashboard, href: `${dashboardPrefix}/dashboard` },
          { label: t.dashboard.affiliate.wallet, icon: Wallet, href: `${dashboardPrefix}/wallet` },
          { label: t.dashboard.affiliate.earnings, icon: TrendingUp, href: `${dashboardPrefix}/earnings` },
          { label: t.dashboard.affiliate.referrals, icon: Users, href: `${dashboardPrefix}/referrals` },
          { label: t.dashboard.affiliate.technical, icon: Code2, href: `${dashboardPrefix}/technical` },
          { label: t.dashboard.affiliate.promotions, icon: Link2, href: `${dashboardPrefix}/promotions` },
          { label: t.dashboard.affiliate.notices, icon: Bell, href: `${dashboardPrefix}/notices` },
          { label: t.dashboard.affiliate.messages, icon: MessageSquare, href: `${dashboardPrefix}/messages` },
        ];

  const isActive = (href: string) => {
    if (href.endsWith("/dashboard")) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const getDisplayName = () => {
    if (isLoading) return "Loading...";
    if (!user) return "Guest User";
    if ("fullName" in user && user.fullName) {
      return user.fullName;
    }
    if ("firstName" in user && user.firstName) {
      return `${user.firstName} ${user.lastName || ""}`.trim();
    }
    if ("name" in user && user.name) {
      return user.name;
    }
    return user.email?.split("@")[0] || "Account";
  };

  const accountIdLabel = formatAccountIdLabel(user);
  const profileLabel = isBusiness
    ? t.business.sidebar.profile
    : !isAffiliate
      ? t.dashboard.user.profile
      : t.dashboard.affiliate.profile;
  const settingsLabel = isBusiness
    ? t.business.sidebar.settings
    : !isAffiliate
      ? t.dashboard.user.settings
      : t.dashboard.affiliate.settings;

  const workspaceRole = isBusiness ? "Business" : isAffiliate ? "Affiliate" : "User";

  const linkClass = (active: boolean, disabled: boolean) =>
    [
      "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all gap-3 px-3",
      disabled
        ? "opacity-45 cursor-not-allowed select-none bg-transparent text-muted-foreground/60"
        : active
          ? "bg-primary text-white font-bold shadow-xs"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
    ].join(" ");

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card">
      {/* Header section — displays User Branding & Full Name */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-xs font-bold">
          <LayoutGrid className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-bold text-foreground">{getDisplayName()}</p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">
            {workspaceRole} Portal
          </p>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const isDisabled = !isComplete;

          if (isDisabled) {
            return (
              <div
                key={item.label}
                title="Complete profile"
                className={linkClass(false, true)}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-50" />
                <span className="truncate">{item.label}</span>
              </div>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => isMobile && onCloseMobile()}
              className={linkClass(active, false)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Single account control — bottom of sidebar footer */}
      <div className="shrink-0 border-t border-border p-3">
        <UserAccountMenu
          profileHref={`${dashboardPrefix}/profile`}
          settingsHref={`${dashboardPrefix}/settings`}
          displayName={isLoading ? "Loading..." : (user?.email || "user@example.com")}
          subtitle={isLoading ? "..." : accountIdLabel}
          avatarUrl={avatarUrl}
          isExpanded={true}
          menuPlacement="up"
          isLoggingOut={logoutMutation.isPending}
          onLogout={() => logoutMutation.mutate()}
          onNavigate={() => isMobile && onCloseMobile()}
          profileLabel={profileLabel}
          settingsLabel={settingsLabel}
          logoutLabel={t.common.ui.logout}
        />
      </div>
    </div>
  );
}

export default AccountSidebarChildren;
