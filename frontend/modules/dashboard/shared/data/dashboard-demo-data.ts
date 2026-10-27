export const DASHBOARD_STATS = [
  { label: "Total Project", value: "150" },
  { label: "Pending Project", value: "10" },
  { label: "Successful Projects", value: "100" },
  { label: "Total Commission", value: "$150" },
  { label: "Total Withdrawn", value: "$100" },
  { label: "Current Balance", value: "$50", showWithdraw: true },
] as const

export const CHART_DATA = [
  { name: "JAN", Increase: 10, Decrease: 5 },
  { name: "FEB", Increase: 35, Decrease: 20 },
  { name: "MAR", Increase: 25, Decrease: 30 },
  { name: "APR", Increase: 12, Decrease: 15 },
  { name: "MAY", Increase: 45, Decrease: 25 },
  { name: "JUN", Increase: 30, Decrease: 10 },
  { name: "JUL", Increase: 55, Decrease: 28 },
  { name: "AGU", Increase: 40, Decrease: 22 },
  { name: "SEP", Increase: 58, Decrease: 18 },
  { name: "OCT", Increase: 50, Decrease: 30 },
  { name: "NOV", Increase: 32, Decrease: 28 },
  { name: "DEC", Increase: 48, Decrease: 15 },
]

const WITHDRAW_METHODS = ["Stripe", "PayPal", "Bank Transfer", "Wise", "Payoneer"] as const
const EARNING_SUBCATEGORIES = ["office", "web dev", "app dev", "fintech", "logistics"] as const
const CURRENCIES = ["INR", "USD", "EUR", "PKG", "GBP"] as const

export interface WithdrawRow {
  id: string
  method: string
  amount: string
  date: string
  status: string
  rejectionReason?: string
  failureReason?: string
  createdAt?: string
  userId?: string
}

export interface EarningRow {
  id: string
  subcategory: string
  commission: string
  status: string
}

export const WITHDRAW_ROWS: WithdrawRow[] = Array.from({ length: 97 }, (_, i) => ({
  id: `1hk${String(45 + (i % 20)).padStart(2, "0")}H`,
  method: WITHDRAW_METHODS[i % WITHDRAW_METHODS.length],
  amount: `${6 + (i % 12)} ${CURRENCIES[i % CURRENCIES.length]}`,
  date: "03 Feb 2025, 2:05 PM (UTC)",
  status: i % 7 === 0 ? "Pending" : "Complete",
}))

export const EARNING_ROWS: EarningRow[] = Array.from({ length: 97 }, (_, i) => ({
  id: `1hk${String(45 + (i % 20)).padStart(2, "0")}H`,
  subcategory: EARNING_SUBCATEGORIES[i % EARNING_SUBCATEGORIES.length],
  commission: `${6 + (i % 8)} ${CURRENCIES[i % CURRENCIES.length]}`,
  status: i % 9 === 0 ? "Pending" : "Complete",
}))
