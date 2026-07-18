"use client"

import React, { useEffect, useState } from "react"
import { Inter } from "next/font/google"
import { useAppSelector } from "@/src/core/store/hooks"
import { Loader2 } from "lucide-react"

const inter = Inter({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
})

interface StatItemProps {
  label: string
  value: string | number
}

const StatItem: React.FC<StatItemProps> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-500 font-medium">{label}</span>
    <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
  </div>
)

interface StatCardProps {
  title: string
  items: StatItemProps[]
}

const StatCard: React.FC<StatCardProps> = ({ title, items }) => (
  <div className="bg-white dark:bg-slate-900 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col h-[320px]">
    <h3 className={`${inter.className} text-[15px] font-bold text-gray-900 dark:text-white mb-4 shrink-0`}>
      {title}
    </h3>
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-1">
      {items.map((item, idx) => (
        <StatItem key={idx} label={item.label} value={item.value} />
      ))}
    </div>
  </div>
)

const SystemOverview: React.FC = () => {
  const { token } = useAppSelector((state) => state.auth)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/admin/api/sso/auth/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) setStats(data.data)
      } catch (err) {
        console.error("Failed to fetch stats", err)
      } finally {
        setIsLoading(false)
      }
    }
    if (token) fetchStats()
  }, [token])

  const formatNumber = (numStr: string | number) => {
    const num = parseInt(String(numStr), 10);
    if (isNaN(num)) return "0";
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }

  const getValue = (role: string, status: string) => {
    if (!stats || !stats[role]) return "0";
    const val = stats[role][status] || 0;
    return formatNumber(val);
  }

  const defaultVal = "12,450K"

  const userStatus = [
    { label: "Total User", value: getValue("user", "total") },
    { label: "Total Active User", value: getValue("user", "ACTIVE") },
    { label: "Total Suspend User", value: getValue("user", "SUSPEND") },
    { label: "Total Block User", value: getValue("user", "BLOCK") },
    { label: "Total Dormant User", value: getValue("user", "DORMANT") },
    { label: "Total Closed User", value: getValue("user", "CLOSED") },
  ]

  const affiliateStatus = [
    { label: "Total Affiliate", value: getValue("affiliate", "total") },
    { label: "Total Active Affiliate", value: getValue("affiliate", "ACTIVE") },
    { label: "Total Suspend Affiliate", value: getValue("affiliate", "SUSPEND") },
    { label: "Total Block Affiliate", value: getValue("affiliate", "BLOCK") },
    { label: "Total Dormant Affiliate", value: getValue("affiliate", "DORMANT") },
    { label: "Total Closed Affiliate", value: getValue("affiliate", "CLOSED") },
  ]

  const businessStatus = [
    { label: "Total Business", value: getValue("business", "total") },
    { label: "Total Pending Business", value: getValue("business", "PENDING") },
    { label: "Total Inactive Business", value: getValue("business", "INACTIVE") },
    { label: "Total Active Business", value: getValue("business", "ACTIVE") },
    { label: "Total Suspend Business", value: getValue("business", "SUSPEND") },
    { label: "Total Block Business", value: getValue("business", "BLOCK") },
    { label: "Total Dormant Business", value: getValue("business", "DORMANT") },
    { label: "Total Closed Business", value: getValue("business", "CLOSED") },
  ]

  const adminStatus = [
    { label: "Total Admin", value: defaultVal },
    { label: "Total Active Admin", value: defaultVal },
    { label: "Total Suspend Admin", value: defaultVal },
    { label: "Total Block Admin", value: defaultVal },
    { label: "Total Closed Admin", value: defaultVal },
  ]

  const technologyStatus = [
    { label: "Total project", value: defaultVal },
    { label: "Total pending", value: defaultVal },
    { label: "Total payment", value: defaultVal },
    { label: "Total Waiting", value: defaultVal },
    { label: "Total Delayed", value: defaultVal },
    { label: "Total Expired", value: defaultVal },
    { label: "Total Accepted", value: defaultVal },
    { label: "Total In Progress", value: defaultVal },
    { label: "Total On Hold", value: defaultVal },
    { label: "Total In Review", value: defaultVal },
    { label: "Total Completed", value: defaultVal },
    { label: "Total Refunded", value: defaultVal },
    { label: "Total Cancelled", value: defaultVal },
  ]

  const technologyService = [
    { label: "Category", value: "12" },
    { label: "Sub category", value: "45" },
    { label: "Skills", value: "505K" },
  ]

  return (
    <div className="px-4 sm:px-6 pt-2 pb-6 w-full max-w-[1600px] mx-auto min-h-[70vh]">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500 font-medium">Loading status overview...</p>
        </div>
      ) : (
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard title="User Status" items={userStatus} />
            <StatCard title="Affiliate Status" items={affiliateStatus} />
            <StatCard title="Business Status" items={businessStatus} />
          <StatCard title="Admin Status" items={adminStatus} />
          
            <StatCard title="Technology Status" items={technologyStatus} />
            <StatCard title="Technology Service" items={technologyService} />
          </div>
        </div>
      )}
    </div>
  )
}

export default SystemOverview
