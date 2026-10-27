"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, useState, type ComponentType } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ProfileTabs, type ProfileTabId } from "../constants/profile.constant"
import { getLogsForUser, LOG_ADDED_EVENT } from "@/src/shared/lib/real-activity-logger"
import { useUser } from "@/src/context/user.provider"

const TabLoading = () => (
  <div className="flex items-center justify-center py-16 text-sm text-gray-500">
    Loading...
  </div>
)

const TAB_COMPONENTS: Record<ProfileTabId, ComponentType> = {
  profile: dynamic(() => import("./ProfilePageLayout"), {
    loading: TabLoading,
  }),
  "user-log": dynamic(() => import("./UserLogLayout"), {
    loading: TabLoading,
  }),
}

const ProfileLayout = () => {
  const router = useRouter()
  const pathname = usePathname()

  const resolveActiveTab = (): ProfileTabId => {
    const match = ProfileTabs.find(
      (tab) =>
        pathname === tab.url ||
        pathname === `/dashboard${tab.url}` ||
        pathname.endsWith(tab.url) ||
        pathname.endsWith(`/${tab.id}`) ||
        pathname.includes(`/${tab.id}`)
    )
    return match?.id ?? ProfileTabs[0].id
  }

  const [activeTab, setActiveTab] = useState<ProfileTabId>(resolveActiveTab)
  
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
    const match = ProfileTabs.find(
      (tab) =>
        pathname === tab.url ||
        pathname === `/dashboard${tab.url}` ||
        pathname.endsWith(tab.url) ||
        pathname.endsWith(`/${tab.id}`) ||
        pathname.includes(`/${tab.id}`)
    )
    setActiveTab(match?.id ?? ProfileTabs[0].id)
  }, [pathname])

  const ActiveComponent = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS.profile

  const handleTabClick = (tab: (typeof ProfileTabs)[number]) => {
    setActiveTab(tab.id)
    const targetUrl = pathname.startsWith("/dashboard")
      ? `/dashboard${tab.url}`
      : tab.url
    router.push(targetUrl)
  }

  return (
    <div className="flex flex-col w-full">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">View and manage your personal information.</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        {ProfileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? "bg-[#5D7293] text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tab.label}
            {tab.id === "user-log" && logCount > 0 && (
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
