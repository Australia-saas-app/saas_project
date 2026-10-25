import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Link2,
  Coins,
  Banknote,
  CreditCard,
  FileBarChart,
  User,
  Wallet,
  Shield,
  Bell,
  Ticket,
  CircleHelp,
} from "lucide-react"

export type AffiliaProAffiliateNavItem = {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

/** AffiliaPro affiliate sidebar — maps design labels onto existing /affiliate routes */
export const AFFILIAPRO_AFFILIATE_NAV: AffiliaProAffiliateNavItem[] = [
  { label: "Dashboard", href: "/affiliate/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Referral Links", href: "/affiliate/promotions", icon: Link2 },
  { label: "Commissions", href: "/affiliate/earnings", icon: Coins },
  { label: "Withdrawals", href: "/affiliate/wallet", icon: Banknote },
  { label: "Payments", href: "/affiliate/wallet", icon: CreditCard },
  { label: "Reports", href: "/affiliate/earnings", icon: FileBarChart },
  { label: "Profile", href: "/affiliate/profile", icon: User },

  { label: "Notifications", href: "/affiliate/notifications", icon: Bell },
  { label: "Tickets", href: "/affiliate/messages", icon: Ticket },
  { label: "Help Center", href: "/affiliate/messages", icon: CircleHelp },
]
