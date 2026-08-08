"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  KeyRound,
  Shield,
  Trash2,
  Monitor,
  Headset,
} from "lucide-react"
import ChangePasswordLayout from "./ChangePasswordLayout"
import AccountSecurityLayout from "@/src/modules/dashboard/shared/components/AccountSecurityLayout"
import AccountDeleteLayout from "@/src/modules/dashboard/shared/components/AccountDeleteLayout"
import DeviceManagementLayout from "@/src/modules/dashboard/shared/components/DeviceManagementLayout"

const SETTINGS_NAV = [
  { id: "password", label: "Change Password", href: "/affiliate/settings/change-password", icon: KeyRound },
  { id: "security", label: "Security", href: "/affiliate/settings/account-security", icon: Shield },
  { id: "device-management", label: "Device Management", href: "/affiliate/settings/device-management", icon: Monitor },
  { id: "account", label: "Account", href: "/affiliate/settings/account-delete", icon: Trash2 },
] as const

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
const labelClass = "mb-1.5 block text-xs font-semibold text-gray-600"
const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
const outlineBtn =
  "inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"

function SettingsSideNav({ activeId }: { activeId: string }) {
  return (
    <aside className="space-y-4">
      <nav className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <ul className="space-y-0.5">
          {SETTINGS_NAV.map((item) => {
            const Icon = item.icon
            const active = activeId === item.id
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-indigo-500" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-gray-900">Need Help?</p>
        <p className="mt-1 text-xs text-gray-500">Our support team is here for you.</p>
        <Link href="/affiliate/messages" className={`${primaryBtn} mt-3 w-full gap-2 text-xs`}>
          <Headset className="h-3.5 w-3.5" />
          Contact Support
        </Link>
      </div>
    </aside>
  )
}

function resolveActiveId(pathname: string) {
  if (pathname.includes("/account-security")) return "security"
  if (pathname.includes("/device-management")) return "device-management"
  if (pathname.includes("/account-delete")) return "account"
  return "password" // Default
}

export default function AffiliaProAffiliateSettingsLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const activeId = resolveActiveId(pathname.replace(/^\/dashboard/, ""))

  let panel: React.ReactNode = <ChangePasswordLayout />
  if (activeId === "security") panel = <AccountSecurityLayout />
  if (activeId === "device-management") panel = <DeviceManagementLayout />
  if (activeId === "account") panel = <AccountDeleteLayout />

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account settings and preferences</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/affiliate/profile")}
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          Go to profile →
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsSideNav activeId={activeId} />
        <div className="min-w-0">{panel}</div>
      </div>
    </div>
  )
}
