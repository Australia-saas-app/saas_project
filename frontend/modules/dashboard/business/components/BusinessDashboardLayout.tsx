"use client"

import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  CreditCard,
  FileBarChart,
  MousePointerClick,
  PieChart as PieChartIcon,
  PlusCircle,
  ShoppingBag,
  Users,
  Wallet,
  Code2,
  History,
  BadgeCheck,
  UserPlus,
  Megaphone,
  Banknote,
  FileText,
} from "lucide-react"
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account"
import {
  ACCOUNT_SUMMARY,
  AFFILIAPRO_KPI,
  DASHBOARD_ACTIVITY,
  EMPTY_ACCOUNT_SUMMARY,
  EMPTY_AFFILIAPRO_KPI,
  PERFORMANCE_OVERVIEW,
  QUICK_ACTIONS,
  RECENT_CONVERSION_ROWS,
  TOP_AFFILIATE_ROWS,
  TOP_CAMPAIGN_ROWS,
  TOP_CAMPAIGNS_BY_SALES,
  type CampaignSalesSlice,
  type DashboardActivityItem,
  type PerformancePoint,
  type RecentConversionRow,
  type TopAffiliateRow,
  type TopCampaignRow,
} from "../data/business-demo-data"

const PRIMARY = "#6366F1"

const KPI_ICONS = {
  clicks: MousePointerClick,
  conversions: Users,
  sales: ShoppingBag,
  payout: Wallet,
  roi: PieChartIcon,
} as const

const ACTION_ICONS = {
  campaign: PlusCircle,
  affiliates: Users,
  reports: FileBarChart,
  funds: CreditCard,
  history: History,
  api: Code2,
} as const

const ACTIVITY_ICONS = {
  violet: UserPlus,
  emerald: Banknote,
  sky: Megaphone,
  amber: FileText,
  pink: FileText,
} as const

const ACTIVITY_TONES: Record<string, string> = {
  violet: "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
  sky: "bg-sky-100 text-sky-600",
  amber: "bg-amber-100 text-amber-600",
  pink: "bg-pink-100 text-pink-600",
}

function statusBadge(status: string) {
  if (status === "Active" || status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15"
  }
  if (status === "Paused" || status === "Pending") {
    return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/15"
  }
  return "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
}

export default function BusinessDashboardLayout() {
  const { demoOrEmpty } = useIsDemoAccount()
  const kpis = demoOrEmpty(AFFILIAPRO_KPI, EMPTY_AFFILIAPRO_KPI)
  const performance = demoOrEmpty(PERFORMANCE_OVERVIEW, [] as PerformancePoint[])
  const campaignSales = demoOrEmpty(TOP_CAMPAIGNS_BY_SALES, [] as CampaignSalesSlice[])
  const campaigns = demoOrEmpty(TOP_CAMPAIGN_ROWS, [] as TopCampaignRow[])
  const affiliates = demoOrEmpty(TOP_AFFILIATE_ROWS, [] as TopAffiliateRow[])
  const conversions = demoOrEmpty(RECENT_CONVERSION_ROWS, [] as RecentConversionRow[])
  const account = demoOrEmpty(ACCOUNT_SUMMARY, EMPTY_ACCOUNT_SUMMARY)
  const activity = demoOrEmpty(DASHBOARD_ACTIVITY, [] as DashboardActivityItem[])
  const totalSalesLabel =
    campaignSales.length > 0
      ? `$${campaignSales.reduce((sum, c) => sum + c.value, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "$0.00"

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Business Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {account.name}! Here&apos;s what&apos;s happening with your campaigns.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          May 1, 2024 - May 31, 2024
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {kpis.map((kpi) => {
              const Icon = KPI_ICONS[kpi.icon]
              return (
                <div
                  key={kpi.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        kpi.positive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                      }`}
                    >
                      {kpi.positive ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {kpi.change}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{kpi.compare}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5 [&>*]:min-w-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Performance Overview</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6]" /> Clicks
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> Conversions
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#6366F1]" /> Sales
                    </span>
                  </div>
                </div>
                <div className="relative self-start">
                  <select className="appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-xs font-medium text-gray-600 focus:outline-none">
                    <option>This Month</option>
                    <option>Last Month</option>
                    <option>This Year</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <div className="h-[260px] w-full">
                {performance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performance} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E5E7EB",
                          fontSize: 12,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                        }}
                      />
                      <Line type="monotone" dataKey="Clicks" stroke="#3B82F6" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="Conversions" stroke="#22C55E" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="Sales" stroke={PRIMARY} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No chart data</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="mb-4 text-base font-bold text-gray-900">Top Campaigns by Sales</h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative mx-auto h-[180px] w-[180px] shrink-0">
                  {campaignSales.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={campaignSales}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={58}
                            outerRadius={82}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {campaignSales.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total Sales</p>
                        <p className="text-sm font-bold text-gray-900">{totalSalesLabel}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">No data</div>
                  )}
                </div>
                <ul className="min-w-0 flex-1 space-y-2.5">
                  {campaignSales.map((c) => (
                    <li key={c.name} className="flex items-start gap-2 text-xs">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-800">{c.name}</p>
                        <p className="text-gray-400">
                          ${c.value.toLocaleString()} · {c.pct}%
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 [&>*]:min-w-0">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Top Campaigns</h2>
                <Link href="/business/services" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-3 font-semibold">Name</th>
                      <th className="pb-3 pr-3 font-semibold">Clicks</th>
                      <th className="pb-3 pr-3 font-semibold">Conv.</th>
                      <th className="pb-3 pr-3 font-semibold">CR%</th>
                      <th className="pb-3 pr-3 font-semibold">Sales</th>
                      <th className="pb-3 font-semibold">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campaigns.map((row) => (
                      <tr key={row.name} className="text-gray-700">
                        <td className="py-3 pr-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-gray-900">{row.name}</span>
                            <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(row.status)}`}>
                              {row.status}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">{row.clicks}</td>
                        <td className="py-3 pr-3">{row.conversions}</td>
                        <td className="py-3 pr-3">{row.cr}</td>
                        <td className="py-3 pr-3 font-medium">{row.sales}</td>
                        <td className="py-3 font-medium">{row.payout}</td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          No campaigns yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">Top Affiliates</h2>
                <Link href="/business/clients" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-3 font-semibold">Affiliate</th>
                      <th className="pb-3 pr-3 font-semibold">Clicks</th>
                      <th className="pb-3 pr-3 font-semibold">Conv.</th>
                      <th className="pb-3 font-semibold">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {affiliates.map((row) => (
                      <tr key={row.name} className="text-gray-700">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${row.avatarBg}`}
                            >
                              {row.initials}
                            </span>
                            <span className="font-semibold text-gray-900">{row.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3">{row.clicks}</td>
                        <td className="py-3 pr-3">{row.conversions}</td>
                        <td className="py-3 font-medium">{row.sales}</td>
                      </tr>
                    ))}
                    {affiliates.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No affiliates yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Recent Conversions</h2>
              <Link href="/business/transaction" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-3 font-semibold">Date</th>
                    <th className="pb-3 pr-3 font-semibold">Affiliate</th>
                    <th className="pb-3 pr-3 font-semibold">Campaign</th>
                    <th className="pb-3 pr-3 font-semibold">Offer</th>
                    <th className="pb-3 pr-3 font-semibold">Amount</th>
                    <th className="pb-3 pr-3 font-semibold">Commission</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {conversions.map((row) => (
                    <tr key={`${row.date}-${row.affiliate}-${row.offer}`} className="text-gray-700">
                      <td className="py-3 pr-3 text-gray-500">{row.date}</td>
                      <td className="py-3 pr-3 font-medium text-gray-900">{row.affiliate}</td>
                      <td className="py-3 pr-3">{row.campaign}</td>
                      <td className="py-3 pr-3">{row.offer}</td>
                      <td className="py-3 pr-3 font-medium">{row.amount}</td>
                      <td className="py-3 pr-3 font-medium">{row.commission}</td>
                      <td className="py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {conversions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No conversions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">
                T
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold text-gray-900">{account.name}</p>
                  {account.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <BadgeCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Account Summary</p>
              </div>
            </div>
            <dl className="space-y-2.5 text-sm">
              {[
                { label: "Account Type", value: account.accountType },
                { label: "Member Since", value: account.memberSince },
                { label: "Balance", value: account.balance, highlight: true },
                { label: "Total Spent", value: account.totalSpent },
                { label: "Available Credit", value: account.availableCredit },
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
              href="/business/wallet"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600"
            >
              <PlusCircle className="h-4 w-4" />
              Add Funds
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-gray-900">Recent Activity</h2>
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

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-gray-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_ACTIONS.map((action) => {
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
        </aside>
      </div>
    </div>
  )
}
