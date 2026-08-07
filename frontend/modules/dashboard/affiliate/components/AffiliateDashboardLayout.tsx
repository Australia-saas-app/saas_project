"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  CreditCard,
  FileBarChart,
  Image,
  Link2,
  MousePointerClick,
  Trophy,
  Users,
  Wallet,
  CheckCircle2,
  UserPlus,
  Banknote,
  Sparkles,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useUser } from "@/src/context/user.provider"
import { useProfileDisplay } from "@/src/modules/dashboard/shared/hooks/use-profile-display"
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account"
import {
  AFFILIATE_ACCOUNT_SUMMARY,
  AFFILIATE_DASH_ACTIVITY,
  AFFILIATE_EARNINGS_CHART,
  AFFILIATE_KPI,
  AFFILIATE_QUICK_LINKS,
  AFFILIATE_SIDE_NOTIFICATIONS,
  EMPTY_AFFILIATE_ACCOUNT_SUMMARY,
  EMPTY_AFFILIATE_KPI,
  TOP_PERFORMING_LINKS,
  type AffiliateDashActivityItem,
  type AffiliateEarningsPoint,
  type AffiliateSideNotification,
  type TopLinkRow,
} from "../data/affiliate-demo-data"

const PRIMARY = "#6366F1"

const KPI_ICONS = {
  clicks: MousePointerClick,
  referrals: Users,
  conversions: CheckCircle2,
  earnings: Wallet,
  pending: Banknote,
} as const

const ACTION_ICONS = {
  link: Link2,
  banners: Image,
  reports: FileBarChart,
  payments: CreditCard,
} as const

const ACTIVITY_ICONS = {
  emerald: CheckCircle2,
  sky: UserPlus,
  amber: Banknote,
  violet: Sparkles,
} as const

const ACTIVITY_TONES: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-600",
  sky: "bg-sky-100 text-sky-600",
  amber: "bg-amber-100 text-amber-600",
  violet: "bg-violet-100 text-violet-600",
}

const DOT_TONES: Record<string, string> = {
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
}

function displayName(user: ReturnType<typeof useUser>["user"], fallback: string) {
  if (!user) return fallback
  // fullName comes from the /me API response (DB field)
  if ("fullName" in user && user.fullName) return String(user.fullName)
  if ("firstName" in user && user.firstName) return String(user.firstName)
  if ("name" in user && user.name) return String(user.name).split(/\s+/)[0]
  return user.email?.split("@")[0] || fallback
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "A"
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return parts[0][0].toUpperCase()
}

export default function AffiliateDashboardLayout() {
  const { user } = useUser()
  const { demoOrEmpty } = useIsDemoAccount()
  const { fullName, initials, displayUserId } = useProfileDisplay()
  const kpis = demoOrEmpty(AFFILIATE_KPI, EMPTY_AFFILIATE_KPI)
  const chart = demoOrEmpty(AFFILIATE_EARNINGS_CHART, [] as AffiliateEarningsPoint[])
  const links = demoOrEmpty(TOP_PERFORMING_LINKS, [] as TopLinkRow[])
  const activity = demoOrEmpty(AFFILIATE_DASH_ACTIVITY, [] as AffiliateDashActivityItem[])
  const account = demoOrEmpty(AFFILIATE_ACCOUNT_SUMMARY, EMPTY_AFFILIATE_ACCOUNT_SUMMARY)
  const notifications = demoOrEmpty(AFFILIATE_SIDE_NOTIFICATIONS, [] as AffiliateSideNotification[])
  
  const greetName = fullName ? fullName.split(/\s+/)[0] : account.name.split(/\s+/)[0]
  const realName = fullName || account.name
  const realInitials = initials

  const memberSince = user && "createdAt" in user && user.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : "—"
  
  const accountId = displayUserId

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Welcome back, {greetName} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s how your affiliate performance looks this month.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Calendar className="h-4 w-4 text-gray-400" />
          May 1, 2024 - May 31, 2024
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {kpis.map((kpi) => {
              const Icon = KPI_ICONS[kpi.icon]
              return (
                <div key={kpi.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {kpi.pending ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                        {kpi.change}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <ArrowUpRight className="h-3 w-3" />
                        {kpi.change}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-gray-900">{kpi.value}</p>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-gray-900">Earnings Overview</h2>
              <div className="relative self-start">
                <select className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-xs font-medium text-gray-600 focus:outline-none">
                  <option>This Month</option>
                  <option>Last Month</option>
                  <option>This Year</option>
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="h-[280px] w-full">
              {chart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="affEarningsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Earnings"]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        fontSize: 12,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Earnings"
                      stroke={PRIMARY}
                      strokeWidth={2.5}
                      fill="url(#affEarningsFill)"
                      dot={{ r: 3.5, fill: PRIMARY, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No chart data</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Top Performing Links</h2>
                <Link
                  href="/affiliate/promotions"
                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                >
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-3 font-semibold">Campaign</th>
                      <th className="pb-3 pr-3 font-semibold">Clicks</th>
                      <th className="pb-3 pr-3 font-semibold">Conv.</th>
                      <th className="pb-3 font-semibold">Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {links.map((row) => (
                      <tr key={row.campaign} className="text-gray-700">
                        <td className="py-3 pr-3 font-semibold text-gray-900">{row.campaign}</td>
                        <td className="py-3 pr-3">{row.clicks}</td>
                        <td className="py-3 pr-3">{row.conversions}</td>
                        <td className="py-3 font-medium text-indigo-600">{row.earnings}</td>
                      </tr>
                    ))}
                    {links.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No links yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
                <Link
                  href="/affiliate/profile"
                  className="text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                >
                  View All
                </Link>
              </div>
              <ul className="space-y-3.5">
                {activity.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.tone]
                  return (
                    <li key={item.title} className="flex gap-3">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ACTIVITY_TONES[item.tone]}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="truncate text-xs text-gray-500">{item.detail}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{item.time}</p>
                      </div>
                    </li>
                  )
                })}
                {activity.length === 0 && (
                  <li className="py-4 text-center text-sm text-gray-400">No recent activity</li>
                )}
              </ul>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-600 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 text-white">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold">Increase Your Earnings</h3>
                  <p className="mt-1 max-w-xl text-sm text-white/85">
                    Browse high-converting offers and create new referral links to grow your commissions.
                  </p>
                </div>
              </div>
              <Link
                href="/affiliate/promotions"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
              >
                Browse Offers
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                {realInitials}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold text-gray-900">{realName}</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    {account.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{account.title}</p>
              </div>
            </div>
            <dl className="space-y-2.5 text-sm">
              {[
                { label: "Member Since", value: memberSince },
                { label: "Account Type", value: "Affiliate" },
                { label: "Account ID", value: accountId },
                { label: "Your Rank", value: account.rank },
                { label: "Available Balance", value: account.balance, highlight: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">{item.label}</dt>
                  <dd className={`font-semibold ${item.highlight ? "text-indigo-600" : "text-gray-900"}`}>
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <Link
              href="/affiliate/wallet"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600"
            >
              Request Withdrawal
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-gray-900">Quick Links</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {AFFILIATE_QUICK_LINKS.map((action) => {
                const Icon = ACTION_ICONS[action.icon]
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-slate-50/80 px-2 py-3 text-center transition-colors hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-gray-700">{action.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Notifications</h2>
              <Link
                href="/affiliate/notices"
                className="text-xs font-semibold text-indigo-500 hover:text-indigo-600"
              >
                View All
              </Link>
            </div>
            <ul className="space-y-3.5">
              {notifications.map((n) => (
                <li key={n.text} className="flex gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_TONES[n.tone]}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{n.text}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{n.time}</p>
                  </div>
                </li>
              ))}
              {notifications.length === 0 && (
                <li className="py-4 text-center text-sm text-gray-400">No notifications</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
