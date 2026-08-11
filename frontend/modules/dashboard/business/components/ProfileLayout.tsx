"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ProfileTabs } from "../constants/profile.constant"
import ProfilePageLayout from "./ProfilePageLayout"
import { getLogsForUser, LOG_ADDED_EVENT } from "@/src/shared/lib/real-activity-logger"
import { useUser } from "@/src/context/user.provider"

const TabLoading = () => (
  <div className="flex items-center justify-center py-16 text-sm text-gray-500">
    Loading...
  </div>
)

const ProfileLayout = () => {
  const router = useRouter()
  const pathname = usePathname()

  const resolveActiveTab = () => {
    const match = ProfileTabs.find((tab) => pathname === tab.url)
    return match?.id ?? ProfileTabs[0].id
  }

  const [activeTab, setActiveTab] = useState(resolveActiveTab)
  
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
    setActiveTab(resolveActiveTab())
  }, [pathname])

  const ActiveComponent =
    ProfileTabs.find((tab) => tab.id === activeTab)?.component ?? ProfilePageLayout

  const handleTabClick = (tab: (typeof ProfileTabs)[0]) => {
    setActiveTab(tab.id)
    router.push(tab.url)
  }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage your business information.</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        {ProfileTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? "bg-[#5D7293] text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
            {tab.id === "business-log" && logCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {formatCount(logCount)}
              </span>
            )}
          </button>
        ))}
      </div>
      <Suspense fallback={<TabLoading />}>
        <ActiveComponent />
      </Suspense>
    </div>
  )
}

export default ProfileLayout
