"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Building2,
  Camera,
  Globe,
  Headset,
  KeyRound,
  Lock,
  MapPin,
  Settings2,
  Shield,
  Trash2,
  User,
  BadgeCheck,
} from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account"
import ChangePasswordLayout from "@/src/modules/dashboard/shared/components/ChangePasswordLayout"
import AccountSecurityLayout from "@/src/modules/dashboard/shared/components/AccountSecurityLayout"
import AccountDeleteLayout from "@/src/modules/dashboard/shared/components/AccountDeleteLayout"
import { useProfileDisplay, getStatusBadgeStyle } from "../../shared/hooks/use-profile-display"

const SETTINGS_NAV = [
  { id: "profile", label: "Profile", href: "/affiliate/settings", icon: User, exact: true },
  { id: "contact", label: "Contact Information", href: "/affiliate/profile#contact", icon: Building2 },
  { id: "address", label: "Address", href: "/affiliate/profile#address", icon: MapPin },
  { id: "identity", label: "Identity Verification", href: "/affiliate/profile#identity", icon: BadgeCheck },
  { id: "security", label: "Security", href: "/affiliate/settings/account-security", icon: Shield },
  { id: "password", label: "Change Password", href: "/affiliate/settings/change-password", icon: KeyRound },
  { id: "preferences", label: "Preferences", href: "/affiliate/profile#preferences", icon: Settings2 },
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
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
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

function ProfileSettingsPanel() {
  const { user } = useUser()
  const { isDemo } = useIsDemoAccount()
  const { status, fullName, initials } = useProfileDisplay()

  const memberSince = user && "createdAt" in user && user.createdAt
    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : "—"

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-gray-900">Profile Information</h2>
          <button
            type="button"
            className={primaryBtn}
            onClick={() => toast.success("Profile changes saved")}
          >
            Save Changes
          </button>
        </div>

        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white">
              {initials}
            </div>
            <span className="absolute -right-0.5 -bottom-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white ring-2 ring-white">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-xs text-gray-400">JPG, PNG or GIF. Max size 2MB.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Full Name</label>
            <input className={inputClass} value={fullName} readOnly />
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <input className={inputClass} defaultValue={isDemo ? "johndoe_affiliate" : ""} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Bio</label>
            <textarea
              className={`${inputClass} min-h-[88px]`}
              defaultValue={isDemo ? "Affiliate marketer | Helping businesses grow online." : ""}
              maxLength={160}
            />
            <p className="mt-1 text-[11px] text-gray-400">58/160</p>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Company (Optional)</label>
            <input className={inputClass} defaultValue={isDemo ? "Doe Digital Solutions" : ""} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Member Since", value: memberSince },
            { label: "Account Status", value: status, badge: true },
            { label: "Account Type", value: "Affiliate" },
            { label: "Country", value: isDemo ? "United States" : "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-100 bg-slate-50/80 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
              {item.badge ? (
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getStatusBadgeStyle(item.value).pill}`}>
                  {getStatusBadgeStyle(item.value).label}
                </span>
              ) : (
                <p className="mt-1 text-sm font-bold text-gray-900">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Change Password",
            desc: "Update your account password regularly.",
            href: "/affiliate/settings/change-password",
            icon: Lock,
            action: "Change",
          },
          {
            title: "2-Step Verification",
            desc: "Add an extra layer of security.",
            href: "/affiliate/settings/account-security",
            icon: Shield,
            action: "Manage",
          },
          {
            title: "Language",
            desc: "Choose your preferred language.",
            href: "/affiliate/profile#preferences",
            icon: Globe,
            action: "Manage",
          },
          {
            title: "Currency",
            desc: "Set payout and display currency.",
            href: "/affiliate/profile#preferences",
            icon: Settings2,
            action: "Manage",
          },
        ].map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-gray-900">{card.title}</p>
              <p className="mt-1 text-xs text-gray-500">{card.desc}</p>
              <Link href={card.href} className={`${outlineBtn} mt-3`}>
                {card.action}
              </Link>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
        Need the full profile editor?{" "}
        <Link href="/affiliate/profile" className="font-semibold text-indigo-600 hover:underline">
          Open Profile Settings
        </Link>
      </div>
    </div>
  )
}

function resolveActiveId(pathname: string) {
  if (pathname.includes("/change-password")) return "password"
  if (pathname.includes("/account-security")) return "security"
  if (pathname.includes("/account-delete")) return "account"
  return "profile"
}

export default function AffiliaProAffiliateSettingsLayout() {
  const pathname = usePathname()
  const router = useRouter()
  const activeId = resolveActiveId(pathname.replace(/^\/dashboard/, ""))

  let panel: React.ReactNode = <ProfileSettingsPanel />
  if (activeId === "password") panel = <ChangePasswordLayout />
  if (activeId === "security") panel = <AccountSecurityLayout />
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
          Go to full profile →
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsSideNav activeId={activeId} />
        <div className="min-w-0">{panel}</div>
      </div>
    </div>
  )
}
