"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, useState, type ComponentType } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ProfileTabs } from "../constants/profile.constant"
import { getLogsForUser, LOG_ADDED_EVENT } from "@/src/shared/lib/real-activity-logger"
import { useUser } from "@/src/context/user.provider"

const TabLoading = () => (
  <div className="flex items-center justify-center py-16 text-sm text-gray-500">
    Loading...
  </div>
)

const TAB_COMPONENTS: Record<string, ComponentType> = {
  profile: dynamic(() => import("./AffiliaProAffiliateProfilePage"), {
    loading: TabLoading,
  }),
  "affiliate-log": dynamic(() => import("./AffiliateLogLayout"), {
    loading: TabLoading,
  }),
}

const ProfileLayout = () => {
  const router = useRouter()
  const pathname = usePathname()
  const normalized = pathname.replace(/^\/dashboard/, "")

  const resolveActiveTab = () => {
    const match = ProfileTabs.find((tab) => normalized === tab.url || pathname === tab.url)
    return match?.id ?? ProfileTabs[0].id
  }

  const [activeTab, setActiveTab] = useState<string>(resolveActiveTab)

  const { user } = useUser() || {}
  const userId = user ? (("publicId" in user && user.publicId) || ("userId" in user && user.userId) || ("id" in user && user.id)) || "guest" : "guest"
  const userEmail = user && "email" in user ? String(user.email) : ""
  const [logCount, setLogCount] = useState(0)

  useEffect(() => {
    const fetchLogCount = async () => {
      let userLogs = await getLogsForUser(userId)
      if (userLogs.length === 0 && userId !== userEmail && userEmail) {
        userLogs = await getLogsForUser(userEmail)
      }
      setLogCount(userLogs.length)
    }
    fetchLogCount()

    window.addEventListener(LOG_ADDED_EVENT, fetchLogCount)
    window.addEventListener("storage", fetchLogCount)
    return () => {
      window.removeEventListener(LOG_ADDED_EVENT, fetchLogCount)
      window.removeEventListener("storage", fetchLogCount)
    }
  }, [userId, userEmail])

  const formatCount = (num: number) => {
    if (num === 0) return null
    if (num < 1000) return num.toString()
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k"
  }

  useEffect(() => {
    const match = ProfileTabs.find((tab) => normalized === tab.url || pathname === tab.url)
    setActiveTab(match?.id ?? ProfileTabs[0].id)
  }, [pathname, normalized])

  const ActiveComponent = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS.profile

  const handleTabClick = (tab: (typeof ProfileTabs)[number]) => {
    setActiveTab(tab.id)
    router.push(tab.url)
  }

  useEffect(() => {
    const handleKycUpdated = (e: any) => {
      if (e.detail?.kycStatus) {
        setKycStatus(e.detail.kycStatus);
      }
    };
    window.addEventListener("vero:kyc_updated", handleKycUpdated);
    return () => window.removeEventListener("vero:kyc_updated", handleKycUpdated);
  }, []);

  const kycStatus = user && "kycStatus" in user ? user.kycStatus : "none";
  const [localKycStatus, setKycStatus] = useState<string | null>(null);

  const displayKycStatus = localKycStatus || kycStatus || "none";
  const isKycVerified = displayKycStatus === "approved" || (user && "status" in user && user.status === "verified");

  return (
    <div className="flex flex-col w-full">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Affiliate Profile</h1>
          <p className="text-sm text-gray-500 mt-1">View and manage your affiliate account and logs.</p>
        </div>

        {/* Status Badge */}
        {activeTab === 'profile' && (displayKycStatus === 'pending' || displayKycStatus === 'submitted' || isKycVerified || displayKycStatus === 'rejected') && (
          <div className={`px-2 py-1 rounded-md flex items-center gap-1.5 border mt-1 shrink-0 ${isKycVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
              : displayKycStatus === 'rejected' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400'
            }`}>
            <span className="font-bold text-[9px] uppercase tracking-wider">Status:</span>
            <span className="font-black text-[9px] uppercase tracking-wider">
              {isKycVerified ? 'Approved' : displayKycStatus === 'rejected' ? 'Rejected' : 'Pending'}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 mb-6 relative z-20 pointer-events-none">
        {ProfileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`pointer-events-auto px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id
              ? "bg-[#5D7293] text-white shadow-sm"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
              }`}
          >
            {tab.label}
            {tab.id === "affiliate-log" && logCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {formatCount(logCount)}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="w-full">
        <Suspense fallback={<TabLoading />}>
          <ActiveComponent />
        </Suspense>
      </div>
    </div>
  )
}

export default ProfileLayout
