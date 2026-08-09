export const PROFILE_BASE = "/user/profile"
export const SETTINGS_BASE = "/user/settings"

export const ProfileTabs = [
  { id: "profile", label: "Profile", url: PROFILE_BASE },
  { id: "user-log", label: "Logs", url: `${PROFILE_BASE}/user-log` },
] as const

export const SettingsTabs = [
  { id: "change-password", label: "Change Password", url: `${SETTINGS_BASE}/change-password` },
  { id: "account-security", label: "Account security", url: `${SETTINGS_BASE}/account-security` },
  { id: "account-delete", label: "Account Delete", url: `${SETTINGS_BASE}/account-delete` },
] as const

export type ProfileTabId = (typeof ProfileTabs)[number]["id"]
export type SettingsTabId = (typeof SettingsTabs)[number]["id"]
