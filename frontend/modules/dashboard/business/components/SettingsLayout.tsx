"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SettingsTabs } from "../constants/profile.constant"
import ChangePasswordLayout from "./ChangePasswordLayout"

const SettingsLayout = () => {
  const router = useRouter()
  const pathname = usePathname()

  const resolveActiveTab = () => {
    const match = SettingsTabs.find((tab) => pathname === tab.url)
    return match?.id ?? SettingsTabs[0].id
  }

  const [activeTab, setActiveTab] = useState(resolveActiveTab)

  useEffect(() => {
    setActiveTab(resolveActiveTab())
  }, [pathname])

  const ActiveComponent =
    SettingsTabs.find((tab) => tab.id === activeTab)?.component ?? ChangePasswordLayout

  const handleTabClick = (tab: (typeof SettingsTabs)[0]) => {
    setActiveTab(tab.id)
    router.push(tab.url)
  }

  return (
    <div className="flex w-full flex-col">
      <div className="mb-2">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account security and preferences.</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2.5">
        {SettingsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={`rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#5D7293] text-white shadow-sm font-semibold"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ActiveComponent />
    </div>
  )
}

export default SettingsLayout
