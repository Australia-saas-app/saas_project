"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser } from "@/src/context/user.provider"
import { useLogout } from "@/src/hooks/auth.hook"
import { usePermission } from "@/src/hooks/permission.hook"
import { useLocale } from "@/src/shared/context/locale.provider"
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
} from "lucide-react"
import { formatAccountIdLabel } from "@/src/shared/lib/demo-user"
import UserAccountMenu from "./UserAccountMenu"

interface SidebarProps {
  isExpanded: boolean
  isMobile: boolean
  onCloseMobile: () => void
}

import { isProfileComplete } from "@/src/shared/lib/profile-completion"
import { getUserIdFromAuthUser } from "@/src/shared/lib/demo-user"
import { useProfileDisplay } from "../hooks/use-profile-display"

export function AccountSidebarChildren({ isExpanded, isMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useUser()
  const { isAffiliate, isBusiness } = usePermission()
  const { t } = useLocale()
  const logoutMutation = useLogout()
  const { avatarUrl } = useProfileDisplay()

  let dashboardPrefix = "/user"
  if (isAffiliate) {
    dashboardPrefix = "/affiliate"
  } else if (isBusiness) {
    dashboardPrefix = "/business"
  }

  const userId = getUserIdFromAuthUser(user)
  const isComplete = isProfileComplete(userId)

  const menuItems = !isAffiliate && !isBusiness
    ? [
        { label: t.dashboard.user.dashboard, icon: LayoutDashboard, href: `${dashboardPrefix}/dashboard` },
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
        ]

  const isActive = (href: string) => {
    if (href.endsWith("/dashboard")) return pathname === href
    return pathname === href || pathname.startsWith(href + "/")
  }

  const getDisplayName = () => {
    if (!user) return "Guest User"
    if ("fullName" in user && user.fullName) {
      return user.fullName
    }
    if ("firstName" in user && user.firstName) {
      return `${user.firstName} ${user.lastName || ""}`.trim()
    }
    if ("name" in user && user.name) {
      return user.name
    }
    return user.email?.split("@")[0] || "Account"
  }

  const accountIdLabel = formatAccountIdLabel(user)
  const profileLabel = isBusiness
    ? t.business.sidebar.profile
    : !isAffiliate
      ? t.dashboard.user.profile
      : t.dashboard.affiliate.profile
  const settingsLabel = isBusiness
    ? t.business.sidebar.settings
    : !isAffiliate
      ? t.dashboard.user.settings
      : t.dashboard.affiliate.settings

  const workspaceRole = isBusiness ? "Business" : isAffiliate ? "Affiliate" : "User"

  const linkClass = (active: boolean, disabled: boolean) =>
    [
      "group relative flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
      isExpanded ? "gap-3 px-3" : "justify-center px-0",
      disabled
        ? "opacity-45 cursor-not-allowed select-none bg-transparent text-muted-foreground/60"
        : active
          ? "bg-[#5D7293] text-white shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
    ].join(" ")

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header section — displays User Full Name & Workspace role, centered */}
      <div
        className={`flex shrink-0 items-center border-b border-border ${
          isExpanded ? "h-16 justify-between px-4" : "h-16 justify-center px-2"
        }`}
      >
        {isExpanded ? (
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold text-foreground">{getDisplayName()}</p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {workspaceRole} workspace
            </p>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#5D7293] text-xs font-bold text-white shadow-sm">
            {getDisplayName().charAt(0).toUpperCase()}
          </div>
        )}
        {isMobile && isExpanded && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={`min-h-0 flex-1 space-y-1 overflow-y-auto ${isExpanded ? "p-3" : "px-2 py-3"}`}>
        {menuItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          const isDisabled = !isComplete

          if (isDisabled) {
            return (
              <div
                key={item.label}
                title="Complete profile"
                className={linkClass(false, true)}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-50" />
                {isExpanded && <span className="truncate">{item.label}</span>}
              </div>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              title={!isExpanded ? item.label : undefined}
              onClick={() => isMobile && onCloseMobile()}
              className={linkClass(active, false)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Single account control — bottom of sidebar footer */}
      <div className={`shrink-0 border-t border-border ${isExpanded ? "p-3" : "px-2 py-3"}`}>
        <UserAccountMenu
          profileHref={`${dashboardPrefix}/profile`}
          settingsHref={`${dashboardPrefix}/settings`}
          displayName={getDisplayName()}
          subtitle={accountIdLabel}
          avatarUrl={avatarUrl}
          isExpanded={isExpanded}
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
  )
}

export default AccountSidebarChildren
