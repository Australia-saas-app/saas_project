import AccountDeleteLayout from "@/src/modules/dashboard/shared/components/AccountDeleteLayout"
import AffiliateLogLayout from "../components/AffiliateLogLayout"
import AccountSecurityLayout from "@/src/modules/dashboard/shared/components/AccountSecurityLayout"
import ChangePasswordLayout from "../components/ChangePasswordLayout"
import ProfilePageLayout from "../components/ProfilePageLayout"

export const PROFILE_BASE = "/affiliate/profile"
export const SETTINGS_BASE = "/affiliate/settings"

export const ProfileTabs = [
  { id: "profile", label: "Profile", component: ProfilePageLayout, url: PROFILE_BASE },
  {
    id: "affiliate-log",
    label: "Affiliate log",
    component: AffiliateLogLayout,
    url: `${PROFILE_BASE}/affiliate-log`,
  },
]

export const SettingsTabs = [
  {
    id: "change-password",
    label: "Change Password",
    component: ChangePasswordLayout,
    url: `${SETTINGS_BASE}/change-password`,
  },
  {
    id: "account-security",
    label: "Account security",
    component: AccountSecurityLayout,
    url: `${SETTINGS_BASE}/account-security`,
  },
  {
    id: "account-delete",
    label: "Account Delete",
    component: AccountDeleteLayout,
    url: `${SETTINGS_BASE}/account-delete`,
  },
]
