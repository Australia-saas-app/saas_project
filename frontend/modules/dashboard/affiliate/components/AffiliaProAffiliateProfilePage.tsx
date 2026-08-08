"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Download,
  Headset,
  KeyRound,
  Monitor,
  Shield,
  Smartphone,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account"
import KycApplicationModal from "../../shared/components/profile/KycApplicationModal"
import { useProfileDisplay, getStatusBadgeStyle } from "../../shared/hooks/use-profile-display"
import { getProfileOverrides } from "@/src/shared/utils/profile-storage"

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100:border-indigo-500"
const labelClass = "mb-1.5 block text-xs font-semibold text-gray-600"
const cardClass = "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
const outlineBtn =
  "inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"

const DEMO_DEVICES = [
  {
    id: "1",
    name: "Windows PC",
    detail: "Chrome · Windows 11",
    location: "Dhaka, BD",
    ip: "103.112.xx.xx",
    lastActive: "Today 10:30 AM",
    current: true,
    icon: Monitor,
  },
  {
    id: "2",
    name: "iPhone 13",
    detail: "Safari · iOS 17",
    location: "Dhaka, BD",
    ip: "103.112.xx.xx",
    lastActive: "Yesterday 08:15 PM",
    current: false,
    icon: Smartphone,
  },
  {
    id: "3",
    name: "MacBook Pro",
    detail: "Chrome · macOS",
    location: "Chittagong, BD",
    ip: "114.130.xx.xx",
    lastActive: "2 days ago",
    current: false,
    icon: Monitor,
  },
]

const ID_FILES = [
  { name: "ID Front Side", file: "nid_front.jpg", date: "Uploaded May 12, 2023" },
  { name: "ID Back Side", file: "nid_back.jpg", date: "Uploaded May 12, 2023" },
  // { name: "Selfie With ID", file: "selfie_id.jpg", date: "Uploaded May 12, 2023" },
]

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      <BadgeCheck className="h-3 w-3" />
      Verified
    </span>
  )
}

function UnaddedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
      Not added yet
    </span>
  )
}

export default function AffiliaProAffiliateProfilePage() {
  const { user } = useUser()
  const { isDemo } = useIsDemoAccount()
  const { 
    rawUserId, displayUserId, isActive, status, isKycVerified, kycStatus, 
    documentUrl, documentFrontUrl, documentBackUrl, nationality, nationalIdentity, 
    avatarUrl, updateProfile, dateOfBirth, kycApplicationData,
    fullName, email: profileEmail, phone: profilePhone, initials
  } = useProfileDisplay()

  const [isKycModalOpen, setIsKycModalOpen] = useState(false)

  const [username, setUsername] = useState(isDemo ? "johndoe_affiliate" : "")
  const [gender, setGender] = useState("Male")
  const [dob, setDob] = useState(isDemo ? "1990-05-15" : "")
  const [bio, setBio] = useState(
    isDemo ? "Affiliate marketer and digital entrepreneur." : ""
  )
  const [telegram, setTelegram] = useState(isDemo ? "@johndoe" : "")
  const [whatsapp, setWhatsapp] = useState(isDemo ? "+880 1234-567890" : "")
  const [country, setCountry] = useState(isDemo ? "Bangladesh" : "United States")
  const [state, setState] = useState(isDemo ? "Dhaka" : "")
  const [city, setCity] = useState(isDemo ? "Dhaka" : "")
  const [zip, setZip] = useState(isDemo ? "1205" : "")
  const [address, setAddress] = useState(
    isDemo ? "House-123, Road-5, Dhanmondi, Dhaka-1205, Bangladesh" : ""
  )
  const [language, setLanguage] = useState("English")
  const [currency, setCurrency] = useState("USD - US Dollar")
  const [timezone, setTimezone] = useState("(UTC+06:00) Dhaka, Bangladesh")
  const [devices, setDevices] = useState(DEMO_DEVICES)

  const save = (label: string) => {
    toast.success(`${label} saved`)
  }

  const handleApplyKycClick = () => {
    if (kycStatus === "pending" || kycStatus === "submitted" || isKycVerified) {
      setIsKycModalOpen(true);
      return;
    }

    if (!fullName || (!profilePhone && !profileEmail) || !dob || !nationality || !nationalIdentity || !documentFrontUrl || !documentBackUrl || !avatarUrl) {
      toast.error("Please complete the profile and upload both Front and Back ID documents before applying for KYC.");
      return;
    }

    setIsKycModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-4">
      {kycStatus === 'rejected' && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-red-700">Account Unverified by Admin</h4>
              <p className="mt-1 text-sm text-red-600/90">
                Your KYC application was rejected. Please review your personal information and re-upload a clear document if needed, then re-apply for KYC.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profile Settings</h1>
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeStyle(status).pill}`}>
              <span className={`h-2 w-2 rounded-full ${getStatusBadgeStyle(status).dot} ${status === 'pending' ? 'animate-pulse' : ''}`} />
              {getStatusBadgeStyle(status).label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage your personal information and account settings.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isKycVerified ? (
            <span className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-600">
              <BadgeCheck className="h-4 w-4" />
              Verified Account
            </span>
          ) : kycStatus === "pending" || kycStatus === "submitted" ? (
            <span className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-medium text-amber-600">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Pending Verification
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-lg bg-slate-500/10 border border-slate-500/20 px-4 py-2 text-sm font-medium text-slate-600">
              Unverified Account
            </span>
          )}
          
          <button 
            type="button"
            onClick={handleApplyKycClick}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all"
          >
            {isKycVerified ? "View Application" : kycStatus === "pending" || kycStatus === "submitted" ? "View Application" : "Apply KYC"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          {/* Profile preview */}
          <section id="preview" className={cardClass}>
            <h2 className="mb-4 text-base font-bold text-gray-900">Profile Preview</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="relative h-36 bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 sm:h-44">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.25),transparent_55%)]" />
              </div>
              <div className="relative -mt-10 flex flex-col gap-4 bg-white px-4 pb-4 pt-0 sm:flex-row sm:items-end sm:px-6 sm:pb-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-indigo-500 text-lg font-bold text-white shadow">
                  {initials}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold text-gray-900">{fullName}</p>
                    <BadgeCheck className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-sm text-gray-500">Affiliate Marketer</p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 sm:grid-cols-4 sm:border-t-0 sm:pt-0 sm:pb-1">
                  {[
                    { label: "Links Clicks", value: isDemo ? "12,456" : "0" },
                    { label: "Referrals", value: isDemo ? "1,234" : "0" },
                    { label: "Earnings", value: isDemo ? "$24,567" : "$0" },
                    { label: "Conversion Rate", value: isDemo ? "3.45%" : "0%" },
                  ].map((s) => (
                    <div key={s.label} className="text-center sm:text-left">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{s.label}</p>
                      <p className="text-sm font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Main Profile Columns */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
            {/* Left Column: Personal + Identity */}
            <div className="flex flex-col gap-5">
              <section id="personal" className={cardClass}>
              <h2 className="mb-4 text-base font-bold text-gray-900">Personal Information</h2>
              <div className="mb-5 flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white">
                    {initials}
                  </div>
                  <button
                    type="button"
                    className="absolute -right-0.5 -bottom-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow ring-2 ring-white"
                    aria-label="Change photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400">JPG, PNG or GIF. Max size 2MB.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full Name</label>
                  <input className={inputClass} value={fullName} readOnly />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Username</label>
                  <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" className={inputClass} value={dob} onChange={(e) => setDob(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Bio (Optional)</label>
                  <textarea
                    className={`${inputClass} min-h-[220px] resize-y`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={160}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" className={primaryBtn} onClick={() => save("Profile")}>
                  Update Profile
                </button>
              </div>
            </section>
            </div>

            {/* Right Column: Contact + Address */}
            <div className="flex flex-col gap-5">
              <section id="contact" className={cardClass}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Contact Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <div className="relative">
                      <input className={`${inputClass} pr-24`} value={profileEmail || ""} readOnly />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        {profileEmail ? <VerifiedBadge /> : <UnaddedBadge />}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <div className="relative">
                      <input
                        className={`${inputClass} pr-24`}
                        value={profilePhone || ""}
                        readOnly
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        {profilePhone ? <VerifiedBadge /> : <UnaddedBadge />}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" className={outlineBtn} onClick={() => save("Contact info")}>
                    Update Contact Info
                  </button>
                </div>
              </section>
              <section id="address" className={cardClass}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Address</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Country</label>
                  <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option>Bangladesh</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>India</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>State / Division</label>
                  <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>ZIP / Postal Code</label>
                  <input className={inputClass} value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Full Address</label>
                  <textarea
                    className={`${inputClass} min-h-[88px] resize-y`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button type="button" className={outlineBtn} onClick={() => save("Address")}>
                  Update Address
                </button>
              </div>
            </section>
            </div>
          </div>

          {/* Identity + Preferences */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            <section id="identity" className={`${cardClass} flex flex-col`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-gray-900">Identity Verification</h2>
                <VerifiedBadge />
              </div>
              <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">ID Type</dt>
                  <dd className="font-semibold text-gray-900">National ID Card</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">ID Number</dt>
                  <dd className="font-semibold text-gray-900">{isDemo ? "1234567890" : "—"}</dd>
                </div>
              </dl>
              <ul className="space-y-2.5">
                {ID_FILES.map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2.5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600">
                      ID
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{f.name}</p>
                      <p className="truncate text-[11px] text-gray-400">
                        {f.file} · {f.date}
                      </p>
                    </div>
                    <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4 flex justify-end">
                <button type="button" className={outlineBtn} onClick={() => toast.message("Verification documents are up to date")}>
                  Update Verification
                </button>
              </div>
            </section>
            <section id="preferences" className={`${cardClass} flex flex-col`}>
              <h2 className="mb-4 text-base font-bold text-gray-900">Language & Currency</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Language</label>
                  <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option>English</option>
                    <option>Spanish</option>
                    <option>Hindi</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option>USD - US Dollar</option>
                    <option>EUR - Euro</option>
                    <option>BDT - Bangladeshi Taka</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Timezone</label>
                  <select className={inputClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option>(UTC+06:00) Dhaka, Bangladesh</option>
                    <option>(UTC-05:00) Eastern Time (US & Canada)</option>
                    <option>(UTC+00:00) London</option>
                  </select>
                </div>
              </div>
              <div className="mt-auto pt-4 flex justify-end">
                <button type="button" className={outlineBtn} onClick={() => save("Preferences")}>
                  Update Preferences
                </button>
              </div>
            </section>
          </div>

          {/* Devices + Security */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
            <section id="devices" className={`${cardClass} min-w-0`}>
              <h2 className="mb-4 text-base font-bold text-gray-900">Device Management</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-2 font-semibold">Device</th>
                      <th className="pb-2 font-semibold">Location</th>
                      <th className="pb-2 font-semibold">Last Active</th>
                      <th className="pb-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {devices.map((d) => {
                      const Icon = d.icon
                      return (
                        <tr key={d.id} className="text-gray-700">
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-gray-400" />
                              <div>
                                <p className="font-semibold text-gray-900">{d.name}</p>
                                <p className="text-[11px] text-gray-400">{d.detail}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-2">
                            <p>{d.location}</p>
                            <p className="text-[11px] text-gray-400">{d.ip}</p>
                          </td>
                          <td className="py-3 pr-2">{d.lastActive}</td>
                          <td className="py-3">
                            {d.current ? (
                              <span className="rounded-full border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                                Current
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setDevices((prev) => prev.filter((x) => x.id !== d.id))
                                  toast.success("Device removed")
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Link
                href="/affiliate/settings/account-security"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600"
              >
                View All Devices <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            <section id="security" className={cardClass}>
              <h2 className="mb-4 text-base font-bold text-gray-900">Security</h2>
              <ul className="divide-y divide-gray-100">
                {[
                  { label: "Password", value: "••••••••", href: "/affiliate/settings/change-password" },
                  {
                    label: "Two-Factor Authentication (2FA)",
                    value: "Enabled",
                    valueClass: "text-emerald-600",
                    href: "/affiliate/settings/account-security",
                  },
                  {
                    label: "Recovery Email",
                    value: isDemo ? "john.doe.recovery@email.com" : profileEmail || "—",
                    href: "/affiliate/settings/account-security",
                  },
                  {
                    label: "Recovery Phone",
                    value: profilePhone || "—",
                    href: "/affiliate/settings/account-security",
                  },
                ].map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                      <p className={`truncate text-xs ${row.valueClass || "text-gray-500"}`}>{row.value}</p>
                    </div>
                    <Link href={row.href} className={outlineBtn}>
                      {row.label.includes("2FA") ? "Manage" : "Change"}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

        </div>

        {/* Right rail */}
        <aside className="space-y-5">
          <div className={`${cardClass} xl:h-[390px] flex flex-col`}>
            <h2 className="mb-4 text-base font-bold text-gray-900">Account Overview</h2>
            <dl className="space-y-3 text-sm">
              {[
                { 
                  label: "Member Since", 
                  value: user && "createdAt" in user && user.createdAt
                    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                    : "—"
                },
                { label: "Account Type", value: "Affiliate" },
                { label: "Status", value: status, badge: true },
                { 
                  label: "ID", 
                  value: displayUserId
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500">{row.label}</dt>
                  <dd>
                    {row.badge ? (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${getStatusBadgeStyle(status).pill}`}>
                        {getStatusBadgeStyle(status).label}
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-900">{row.value}</span>
                    )}
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Email</dt>
                <dd>
                  {profileEmail ? (
                    <VerifiedBadge />
                  ) : (
                    <UnaddedBadge />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">Phone</dt>
                <dd>
                  {profilePhone ? (
                    <VerifiedBadge />
                  ) : (
                    <UnaddedBadge />
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className={`${cardClass} xl:h-[305px] flex flex-col justify-center`}>
            <h2 className="mb-3 text-base font-bold text-gray-900">Quick Links</h2>
            <ul className="space-y-1">
              {[
                { label: "Change Password", href: "/affiliate/settings/change-password", icon: KeyRound },
                { label: "Two-Factor Authentication", href: "/affiliate/settings/account-security", icon: Shield },
                { label: "Manage Devices", href: "#devices", icon: Monitor },
                { label: "Download My Data", href: "/affiliate/messages", icon: Download },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className={cardClass}>
            <h2 className="mb-3 text-base font-bold text-gray-900">Delete Account</h2>
            <div className="mb-3 flex gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <p>
                Once you delete your account, there is no going back. All your
                data and earnings will be permanently deleted.
              </p>
            </div>
            <Link
              href="/affiliate/settings/account-delete"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete My Account
            </Link>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Need Help?</h2>
            <p className="mt-1 text-sm text-gray-500">
              If you need help with your account, contact our support team.
            </p>
            <Link href="/affiliate/messages" className={`${primaryBtn} mt-4 w-full gap-2`}>
              <Headset className="h-4 w-4" />
              Contact Support
            </Link>
          </div>

          <Link
            href="/affiliate/profile/affiliate-log"
            className="block rounded-2xl border border-gray-100 bg-white px-4 py-3 text-center text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50"
          >
            View Affiliate Log
          </Link>
        </aside>
      </div>
      <KycApplicationModal 
        isOpen={isKycModalOpen} 
        onClose={() => setIsKycModalOpen(false)}
        kycStatus={kycStatus}
        isKycVerified={isKycVerified}
        onSuccess={() => window.location.reload()}
        user={{
          rawUserId,
          displayUserId: rawUserId,
          fullName,
          email: profileEmail,
          nationality,
          nationalIdentity,
          governmentIdType: (getProfileOverrides(rawUserId) as any).governmentIdType,
          avatarUrl,
          documentUrl,
          documentFrontUrl,
          documentBackUrl,
          kycApplicationData: (user as any)?.kycApplicationData
        }}
      />
    </div>
  )
}
