import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

import SettingsLayout from "@/src/modules/dashboard/business/components/SettingsLayout"

export default function Page() {
  return <SettingsLayout />
}
