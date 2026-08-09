import AccountDeleteLayout from "@/src/modules/dashboard/shared/components/AccountDeleteLayout"
import BusinessLogLayout from "../components/BusinessLogLayout"
import PenaltyLayout from "../components/PenaltyLayout"
import AccountSecurityLayout from "@/src/modules/dashboard/shared/components/AccountSecurityLayout"
import ChangePasswordLayout from "@/src/modules/dashboard/shared/components/ChangePasswordLayout"
import ProfilePageLayout from "../components/ProfilePageLayout"

export const PROFILE_BASE = "/business/profile"
export const SETTINGS_BASE = "/business/settings"

export const ProfileTabs = [
  { id: "profile", label: "Profile", component: ProfilePageLayout, url: PROFILE_BASE },
  {
    id: "business-log",
    label: "Logs",
    component: BusinessLogLayout,
    url: `${PROFILE_BASE}/business-log`,
  },
  {
    id: "penalty",
    label: "Penalty",
    component: PenaltyLayout,
    url: `${PROFILE_BASE}/penalty`,
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
