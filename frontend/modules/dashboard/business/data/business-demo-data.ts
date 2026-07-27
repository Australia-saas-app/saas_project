export const BUSINESS_SERVICE_STATS = [
  { label: "Active Services", value: "24" },
  { label: "Pending Approval", value: "6" },
  { label: "Completed Jobs", value: "118" },
  { label: "Monthly Revenue", value: "$4,250" },
] as const

export const SERVICE_CATEGORIES = [
  { name: "Construction", count: 42, color: "bg-[#58719b]" },
  { name: "Technical", count: 28, color: "bg-[#0091ff]" },
  { name: "Real Estate", count: 19, color: "bg-[#5D7293]" },
  { name: "Import & Export", count: 15, color: "bg-[#6b8cae]" },
  { name: "Visa & Travel", count: 11, color: "bg-[#7a9bb8]" },
  { name: "Logistics", count: 9, color: "bg-[#8aa8c4]" },
] as const

export type ServiceStatus = "Active" | "Pending" | "Completed" | "On Hold"

export interface BusinessServiceRow {
  id: string
  category: string
  client: string
  budget: string
  deadline: string
  status: ServiceStatus
  title?: string
  subCategory?: string
  summary?: string
  skills?: string[]
  deliverables?: string[]
  coverUrl?: string
}

const CLIENTS = [
  "Acme Corp",
  "Global Trade Ltd",
  "Summit Builders",
  "Nova Tech",
  "Harbor Logistics",
  "Prime Estates",
] as const

const CATEGORIES = [
  "Construction",
  "Technical",
  "Real Estate",
  "Import & Export",
  "Visa & Travel",
  "Logistics",
] as const

const STATUSES: ServiceStatus[] = ["Active", "Pending", "Completed", "On Hold"]

export const BUSINESS_SERVICE_ROWS: BusinessServiceRow[] = Array.from({ length: 48 }, (_, i) => ({
  id: `SRV-${String(1001 + i).padStart(4, "0")}`,
  category: CATEGORIES[i % CATEGORIES.length],
  client: CLIENTS[i % CLIENTS.length],
  budget: `$${(1200 + (i % 15) * 350).toLocaleString()}`,
  deadline: `${(i % 28) + 1} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i % 6]} 2025`,
  status: STATUSES[i % STATUSES.length],
}))

export const TRANSACTION_STATS = [
  { label: "Total Inflow", value: "$12,480" },
  { label: "Total Outflow", value: "$8,920" },
  { label: "Pending", value: "$640" },
  { label: "Available Balance", value: "$2,920", highlight: true },
] as const

export type TransactionType = "Deposit" | "Withdrawal" | "Invoice" | "Commission"
export type TransactionStatus = "Complete" | "Pending" | "Failed"

export interface BusinessTransactionRow {
  id: string
  type: TransactionType
  description: string
  amount: string
  method: string
  date: string
  status: TransactionStatus
}

const TX_TYPES: TransactionType[] = ["Deposit", "Withdrawal", "Invoice", "Commission"]
const TX_METHODS = ["Stripe", "PayPal", "Bank Transfer", "Wise", "Internal"] as const
const TX_DESCRIPTIONS = [
  "Project milestone payment",
  "Service commission payout",
  "Client invoice settlement",
  "Wallet top-up",
  "Withdrawal to bank",
  "Refund adjustment",
] as const

export const BUSINESS_TRANSACTION_ROWS: BusinessTransactionRow[] = Array.from({ length: 64 }, (_, i) => ({
  id: `TXN-${String(8800 + i).padStart(4, "0")}`,
  type: TX_TYPES[i % TX_TYPES.length],
  description: TX_DESCRIPTIONS[i % TX_DESCRIPTIONS.length],
  amount: `${i % 2 === 0 ? "+" : "-"}$${(45 + (i % 20) * 18).toFixed(2)}`,
  method: TX_METHODS[i % TX_METHODS.length],
  date: `${(i % 28) + 1} Feb 2025, ${(i % 12) + 1}:${String((i * 7) % 60).padStart(2, "0")} PM (UTC)`,
  status: i % 11 === 0 ? "Failed" : i % 5 === 0 ? "Pending" : "Complete",
}))

export const BUSINESS_STATS = {
  totalProjects: 150,
  pendingProjects: 10,
  successfulProjects: 118,
  totalCommission: "$4,250",
  totalWithdrawn: "$8,920",
  currentBalance: "$2,920",
  activeServices: 24,
  monthlyRevenue: "$4,250",
  unreadNotices: 2,
  unreadMessages: 3,
  activeClients: 18,
} as const

export interface BusinessActivityItem {
  action: string
  category: string
  date: string
}

export const BUSINESS_RECENT_ACTIVITY: BusinessActivityItem[] = [
  { action: "Service SRV-1024 marked completed — Construction", category: "Services", date: "03 Feb 2025" },
  { action: "Client payment received — $2,400 from Acme Corp", category: "Transaction", date: "02 Feb 2025" },
  { action: "New technical project posted — E-commerce rebuild", category: "Technical", date: "01 Feb 2025" },
  { action: "Invoice TXN-8812 settled via Stripe", category: "Finance", date: "30 Jan 2025" },
  { action: "Service listing approved — Real Estate", category: "Services", date: "28 Jan 2025" },
  { action: "Withdrawal processed — $500 to bank", category: "Wallet", date: "25 Jan 2025" },
]

export interface BusinessClient {
  id: string
  name: string
  email: string
  industry: string
  activeJobs: number
  totalSpent: string
  status: string
  since: string
}

export const BUSINESS_CLIENTS: BusinessClient[] = [
  { id: "CLT-001", name: "Acme Corp", email: "contact@acme.com", industry: "Manufacturing", activeJobs: 3, totalSpent: "$12,400", status: "Active", since: "2024/03" },
  { id: "CLT-002", name: "Global Trade Ltd", email: "ops@globaltrade.com", industry: "Import/Export", activeJobs: 2, totalSpent: "$8,650", status: "Active", since: "2024/06" },
  { id: "CLT-003", name: "Summit Builders", email: "pm@summit.com", industry: "Construction", activeJobs: 4, totalSpent: "$22,100", status: "Active", since: "2023/11" },
  { id: "CLT-004", name: "Nova Tech", email: "hello@novatech.io", industry: "Technology", activeJobs: 1, totalSpent: "$5,200", status: "Active", since: "2024/09" },
  { id: "CLT-005", name: "Harbor Logistics", email: "billing@harbor.com", industry: "Logistics", activeJobs: 2, totalSpent: "$6,800", status: "On Hold", since: "2024/01" },
  { id: "CLT-006", name: "Prime Estates", email: "info@primeestates.com", industry: "Real Estate", activeJobs: 1, totalSpent: "$15,300", status: "Active", since: "2024/04" },
  { id: "CLT-007", name: "Metro Healthcare", email: "admin@metrohc.com", industry: "Healthcare", activeJobs: 0, totalSpent: "$3,400", status: "Inactive", since: "2023/08" },
  { id: "CLT-008", name: "Skyline Airlines", email: "partners@skyline.com", industry: "Transport", activeJobs: 1, totalSpent: "$9,100", status: "Active", since: "2024/07" },
]

export interface BusinessNotice {
  id: string
  title: string
  category: string
  read: boolean
  date: string
}

export const BUSINESS_NOTICES: BusinessNotice[] = [
  { id: "BN-001", title: "Q1 business performance report available", category: "Reports", read: false, date: "2025/02/03" },
  { id: "BN-002", title: "New service category: Healthcare added", category: "Services", read: false, date: "2025/02/01" },
  { id: "BN-003", title: "Invoice TXN-8815 requires your review", category: "Finance", read: true, date: "2025/01/30" },
  { id: "BN-004", title: "Platform fee update effective March 2025", category: "Policy", read: true, date: "2025/01/25" },
  { id: "BN-005", title: "Technical project bidding deadline reminder", category: "Technical", read: true, date: "2025/01/20" },
]

export interface BusinessMessage {
  id: string
  from: string
  subject: string
  body: string
  category: string
  unread: boolean
  date: string
}

export const BUSINESS_MESSAGES: BusinessMessage[] = [
  { id: "BMSG-01", from: "Account Manager", subject: "Your business verification is complete", body: "Your business account has been fully verified. You now have access to premium service listings and priority payout processing.", category: "Account", unread: true, date: "2025/02/03" },
  { id: "BMSG-02", from: "Finance Team", subject: "Invoice TXN-8812 payment confirmed", body: "Payment of $2,400 for invoice TXN-8812 has been confirmed and credited to your business wallet. A receipt is available in Transactions.", category: "Finance", unread: true, date: "2025/02/02" },
  { id: "BMSG-03", from: "Acme Corp", subject: "Project SRV-1024 milestone approval", body: "Acme Corp has approved milestone 2 for project SRV-1024. You may proceed with the next delivery phase as outlined in the statement of work.", category: "Client", unread: false, date: "2025/01/30" },
  { id: "BMSG-04", from: "Support", subject: "Service listing guidelines update", body: "Updated service listing guidelines are now in effect. Please review pricing transparency and delivery timeline requirements before publishing new services.", category: "Support", unread: true, date: "2025/01/28" },
  { id: "BMSG-05", from: "Summit Builders", subject: "New construction project inquiry", body: "Summit Builders is interested in your construction management services for a commercial renovation project. Reply to discuss scope and timeline.", category: "Client", unread: false, date: "2025/01/25" },
  { id: "BMSG-06", from: "Platform Admin", subject: "Monthly revenue summary ready", body: "Your January revenue summary is ready. Total inflow: $12,480 | Net commission: $485. View the full breakdown in your transaction center.", category: "Reports", unread: false, date: "2025/01/22" },
]

export const BUSINESS_LOG_ENTRIES = [
  { action: "Account verified — business tier Gold", date: "2025/02/03 10:15" },
  { action: "Service SRV-1024 marked completed", date: "2025/02/02 14:30" },
  { action: "Client payment received — Acme Corp $2,400", date: "2025/01/30 09:00" },
  { action: "Business document submitted for review", date: "2025/01/28 16:45" },
  { action: "Service listing approved — Real Estate", date: "2025/01/25 11:20" },
  { action: "Withdrawal request processed — $500", date: "2025/01/22 08:30" },
  { action: "New client onboarded — Nova Tech", date: "2025/01/18 13:40" },
  { action: "Technical project posted — E-commerce rebuild", date: "2025/01/15 17:55" },
]

export const BUSINESS_SERVICE_SHORTCUTS = [
  { label: "Construction", href: "/careers", desc: "Post construction jobs" },
  { label: "Technical", href: "/technical", desc: "Tech project listings" },
  { label: "Real Estate", href: "/real-estate", desc: "Property services" },
  { label: "Marketplace", href: "/marketplace", desc: "Product listings" },
  { label: "Courses", href: "/courses", desc: "Training services" },
  { label: "Transport", href: "/transport", desc: "Logistics & travel" },
] as const

/** AffiliaPro-style business dashboard metrics & tables */
export type BusinessKpiIcon = "clicks" | "conversions" | "sales" | "payout" | "roi"
export type BusinessActivityTone = "violet" | "emerald" | "sky" | "amber" | "pink"
export type BusinessQuickIcon = "campaign" | "affiliates" | "reports" | "funds" | "history" | "api"

export interface BusinessKpiItem {
  id: string
  label: string
  value: string
  change: string
  positive: boolean
  compare: string
  icon: BusinessKpiIcon
  iconBg: string
}

export const AFFILIAPRO_KPI: BusinessKpiItem[] = [
  {
    id: "clicks",
    label: "Total Clicks",
    value: "125,456",
    change: "+18.5%",
    positive: true,
    compare: "vs Apr 1 - Apr 30",
    icon: "clicks",
    iconBg: "bg-violet-100 text-violet-600",
  },
  {
    id: "conversions",
    label: "Total Conversions",
    value: "8,752",
    change: "+22.7%",
    positive: true,
    compare: "vs Apr 1 - Apr 30",
    icon: "conversions",
    iconBg: "bg-emerald-100 text-emerald-600",
  },
  {
    id: "sales",
    label: "Total Sales",
    value: "$48,756.80",
    change: "+15.3%",
    positive: true,
    compare: "vs Apr 1 - Apr 30",
    icon: "sales",
    iconBg: "bg-amber-100 text-amber-600",
  },
  {
    id: "payout",
    label: "Total Payout",
    value: "$21,342.50",
    change: "+9.8%",
    positive: true,
    compare: "vs Apr 1 - Apr 30",
    icon: "payout",
    iconBg: "bg-sky-100 text-sky-600",
  },
  {
    id: "roi",
    label: "ROI",
    value: "128.67%",
    change: "+5.2%",
    positive: true,
    compare: "vs Apr 1 - Apr 30",
    icon: "roi",
    iconBg: "bg-pink-100 text-pink-600",
  },
]

export const EMPTY_AFFILIAPRO_KPI: BusinessKpiItem[] = AFFILIAPRO_KPI.map((k) => ({
  ...k,
  value: k.id === "sales" || k.id === "payout" ? "$0.00" : k.id === "roi" ? "0%" : "0",
  change: "0%",
  positive: true,
}))

export interface PerformancePoint {
  day: string
  Clicks: number
  Conversions: number
  Sales: number
}

export const PERFORMANCE_OVERVIEW: PerformancePoint[] = [
  { day: "May 1", Clicks: 3200, Conversions: 210, Sales: 1200 },
  { day: "May 5", Clicks: 4100, Conversions: 280, Sales: 1580 },
  { day: "May 10", Clicks: 3800, Conversions: 250, Sales: 1420 },
  { day: "May 15", Clicks: 5200, Conversions: 360, Sales: 2100 },
  { day: "May 20", Clicks: 4800, Conversions: 310, Sales: 1890 },
  { day: "May 25", Clicks: 6100, Conversions: 420, Sales: 2450 },
  { day: "May 31", Clicks: 5500, Conversions: 390, Sales: 2280 },
]

export interface CampaignSalesSlice {
  name: string
  value: number
  pct: number
  color: string
}

export const TOP_CAMPAIGNS_BY_SALES: CampaignSalesSlice[] = [
  { name: "Summer Mega Sale", value: 18430, pct: 37.8, color: "#6366F1" },
  { name: "Tech Products", value: 14240, pct: 29.2, color: "#22C55E" },
  { name: "Hosting Plan", value: 8780, pct: 18.0, color: "#F59E0B" },
  { name: "Software Tools", value: 4880, pct: 10.0, color: "#3B82F6" },
  { name: "Others", value: 2426, pct: 5.0, color: "#A78BFA" },
]

export type CampaignStatus = "Active" | "Paused"

export interface TopCampaignRow {
  name: string
  status: CampaignStatus
  clicks: string
  conversions: string
  cr: string
  sales: string
  payout: string
}

export const TOP_CAMPAIGN_ROWS: TopCampaignRow[] = [
  { name: "Summer Mega Sale 2024", status: "Active", clicks: "42,850", conversions: "3,210", cr: "7.49%", sales: "$18,430.20", payout: "$7,890.50" },
  { name: "Tech Products Promo", status: "Active", clicks: "31,200", conversions: "2,480", cr: "7.95%", sales: "$14,240.00", payout: "$6,120.00" },
  { name: "Black Friday Early Access", status: "Paused", clicks: "18,640", conversions: "1,120", cr: "6.01%", sales: "$8,280.40", payout: "$3,540.20" },
  { name: "New User Welcome Offer", status: "Active", clicks: "15,890", conversions: "980", cr: "6.17%", sales: "$4,880.10", payout: "$2,100.80" },
  { name: "Holiday Gift Guide", status: "Active", clicks: "9,420", conversions: "620", cr: "6.58%", sales: "$2,926.10", payout: "$1,291.00" },
]

export interface TopAffiliateRow {
  name: string
  initials: string
  avatarBg: string
  clicks: string
  conversions: string
  sales: string
}

export const TOP_AFFILIATE_ROWS: TopAffiliateRow[] = [
  { name: "Sarah Johnson", initials: "SJ", avatarBg: "bg-violet-500", clicks: "18,420", conversions: "1,240", sales: "$9,860.00" },
  { name: "Michael Chen", initials: "MC", avatarBg: "bg-sky-500", clicks: "15,890", conversions: "1,080", sales: "$8,240.50" },
  { name: "Emma Williams", initials: "EW", avatarBg: "bg-emerald-500", clicks: "12,340", conversions: "890", sales: "$6,720.30" },
  { name: "James Rodriguez", initials: "JR", avatarBg: "bg-amber-500", clicks: "10,280", conversions: "720", sales: "$5,410.00" },
  { name: "Olivia Brown", initials: "OB", avatarBg: "bg-pink-500", clicks: "8,650", conversions: "610", sales: "$4,290.80" },
]

export type ConversionStatus = "Approved" | "Pending"

export interface RecentConversionRow {
  date: string
  affiliate: string
  campaign: string
  offer: string
  amount: string
  commission: string
  status: ConversionStatus
}

export const RECENT_CONVERSION_ROWS: RecentConversionRow[] = [
  { date: "May 31, 10:42 AM", affiliate: "Sarah Johnson", campaign: "Summer Mega Sale", offer: "Wireless Earbuds Pro", amount: "$89.99", commission: "$18.00", status: "Approved" },
  { date: "May 31, 09:15 AM", affiliate: "Michael Chen", campaign: "Tech Products Promo", offer: "Smart Watch X3", amount: "$249.00", commission: "$49.80", status: "Approved" },
  { date: "May 30, 06:28 PM", affiliate: "Emma Williams", campaign: "New User Welcome", offer: "Premium Subscription", amount: "$29.99", commission: "$9.00", status: "Pending" },
  { date: "May 30, 02:11 PM", affiliate: "James Rodriguez", campaign: "Summer Mega Sale", offer: "Laptop Stand Pro", amount: "$59.99", commission: "$12.00", status: "Approved" },
  { date: "May 29, 11:05 AM", affiliate: "Olivia Brown", campaign: "Holiday Gift Guide", offer: "Bluetooth Speaker", amount: "$79.99", commission: "$16.00", status: "Pending" },
  { date: "May 29, 08:44 AM", affiliate: "Sarah Johnson", campaign: "Tech Products Promo", offer: "USB-C Hub 7-in-1", amount: "$45.00", commission: "$9.00", status: "Approved" },
]

export interface BusinessAccountSummary {
  name: string
  verified: boolean
  accountType: string
  memberSince: string
  balance: string
  totalSpent: string
  availableCredit: string
}

export const ACCOUNT_SUMMARY: BusinessAccountSummary = {
  name: "TechWorld Solutions",
  verified: true,
  accountType: "Business",
  memberSince: "Jan 15, 2023",
  balance: "$4,567.30",
  totalSpent: "$128,450.00",
  availableCredit: "$10,000.00",
}

export const EMPTY_ACCOUNT_SUMMARY: BusinessAccountSummary = {
  ...ACCOUNT_SUMMARY,
  balance: "$0.00",
  totalSpent: "$0.00",
  availableCredit: "$0.00",
}

export interface DashboardActivityItem {
  title: string
  detail: string
  time: string
  tone: BusinessActivityTone
}

export const DASHBOARD_ACTIVITY: DashboardActivityItem[] = [
  { title: "New Affiliate Registered", detail: "Sarah Johnson joined your network", time: "2 mins ago", tone: "violet" },
  { title: "Payout Processed", detail: "$1,240.50 sent to Michael Chen", time: "1 hour ago", tone: "emerald" },
  { title: "Campaign Approved", detail: "Summer Mega Sale is now live", time: "3 hours ago", tone: "sky" },
  { title: "Conversion Pending", detail: "Emma Williams — Premium Subscription", time: "5 hours ago", tone: "amber" },
  { title: "Invoice Generated", detail: "INV-2024-0842 ready for download", time: "Yesterday", tone: "pink" },
]

export interface BusinessQuickAction {
  label: string
  href: string
  icon: BusinessQuickIcon
}

export const QUICK_ACTIONS: BusinessQuickAction[] = [
  { label: "Create Campaign", href: "/business/services", icon: "campaign" },
  { label: "Manage Affiliates", href: "/business/clients", icon: "affiliates" },
  { label: "View Reports", href: "/business/transaction", icon: "reports" },
  { label: "Add Funds", href: "/business/wallet", icon: "funds" },
  { label: "Payment History", href: "/business/transaction", icon: "history" },
  { label: "API Integration", href: "/business/profile", icon: "api" },
]
