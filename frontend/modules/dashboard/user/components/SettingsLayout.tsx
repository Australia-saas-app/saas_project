"use client"

import dynamic from "next/dynamic"
import { Suspense, useEffect, useState, type ComponentType } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SettingsTabs, type SettingsTabId } from "../constants/profile.constant"

const TabLoading = () => (
  <div className="flex items-center justify-center py-16 text-sm text-gray-500">
    Loading...
  </div>
)

const TAB_COMPONENTS: Record<SettingsTabId, ComponentType> = {
  "change-password": dynamic(() => import("@/src/modules/dashboard/shared/components/ChangePasswordLayout"), {
    loading: TabLoading,
  }),
  "account-security": dynamic(() => import("@/src/modules/dashboard/shared/components/AccountSecurityLayout"), {
    loading: TabLoading,
  }),
  "account-delete": dynamic(() => import("@/src/modules/dashboard/shared/components/AccountDeleteLayout"), {
    loading: TabLoading,
  }),
}

const SettingsLayout = () => {
  const router = useRouter()
  const pathname = usePathname()

  const resolveActiveTab = (): SettingsTabId => {
    const match = SettingsTabs.find((tab) => pathname === tab.url)
    return match?.id ?? SettingsTabs[0].id
  }

  const [activeTab, setActiveTab] = useState<SettingsTabId>(resolveActiveTab)

  useEffect(() => {
    const match = SettingsTabs.find((tab) => pathname === tab.url)
    setActiveTab(match?.id ?? SettingsTabs[0].id)
  }, [pathname])

  const ActiveComponent = TAB_COMPONENTS[activeTab] ?? TAB_COMPONENTS["change-password"]

  const handleTabClick = (tab: (typeof SettingsTabs)[number]) => {
    setActiveTab(tab.id)
    router.push(tab.url)
  }

  return (
    <div className="flex flex-col w-full">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account security and preferences.</p>
      </div>
      <div className="flex flex-wrap gap-2.5 mb-6">
        {SettingsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#5D7293] text-white shadow-sm font-semibold"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {tab.label}
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

export default SettingsLayout
