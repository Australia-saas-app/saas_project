import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

import dynamic from "next/dynamic"

const SettingsLayout = dynamic(
  () => import("@/src/modules/dashboard/user/components/SettingsLayout"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        Loading settings...
      </div>
    ),
  }
)

export default function Page() {
  return <SettingsLayout />
}
