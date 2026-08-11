import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Megaphone,
  PlusCircle,
  Image,
  LayoutTemplate,
  Users,
  UserPlus,
  Award,
  Target,
  MousePointerClick,
  FileBarChart,
  LineChart,
  CreditCard,
  Banknote,
  FileText,
  History,
  Code2,
  Plug,
  ScrollText,
  Building2,
  Wallet,
  Bell,
} from "lucide-react"

export type AffiliaProNavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Match exact path only (for dashboard) */
  exact?: boolean
}

export type AffiliaProNavGroup = {
  id: string
  label?: string
  items: AffiliaProNavItem[]
}

/** AffiliaPro business sidebar — maps design labels onto existing /business routes */
export const AFFILIAPRO_NAV_GROUPS: AffiliaProNavGroup[] = [
  {
    id: "main",
    items: [
      {
        label: "Dashboard",
        href: "/business/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    id: "campaigns",
    label: "Campaign Management",
    items: [
      { label: "Campaigns", href: "/business/services", icon: Megaphone },
      { label: "Create Campaign", href: "/business/services", icon: PlusCircle },
      { label: "Ad Creatives", href: "/business/services", icon: Image },
      { label: "Landing Pages", href: "/business/services", icon: LayoutTemplate },
    ],
  },
  {
    id: "affiliates",
    label: "Affiliate Management",
    items: [
      { label: "Affiliates", href: "/business/clients", icon: Users },
      { label: "Affiliate Applications", href: "/business/clients", icon: UserPlus },
      { label: "Affiliate Tiers", href: "/business/clients", icon: Award },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    items: [
      { label: "Conversions", href: "/business/transaction", icon: Target },
      { label: "Clicks", href: "/business/transaction", icon: MousePointerClick },
      { label: "Reports", href: "/business/transaction", icon: FileBarChart },
      { label: "Analytics", href: "/business/transaction", icon: LineChart },
    ],
  },
  {
    id: "financial",
    label: "Financial",
    items: [
      { label: "Payments", href: "/business/wallet", icon: CreditCard },
      { label: "Payouts", href: "/business/wallet", icon: Banknote },
      { label: "Invoices", href: "/business/transaction", icon: FileText },
      { label: "Transaction History", href: "/business/transaction", icon: History },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { label: "Postback & API", href: "/business/technical", icon: Code2 },
      { label: "Integration", href: "/business/integration", icon: Plug },
      { label: "Audit Logs", href: "/business/profile/business-log", icon: ScrollText },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { label: "Business Profile", href: "/business/profile", icon: Building2 },
      { label: "Payment Settings", href: "/business/settings", icon: Wallet },
      { label: "Notification Settings", href: "/business/settings", icon: Bell },
    ],
  },
]
