import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

import SettingsLayout from "@/src/modules/dashboard/affiliate/components/SettingsLayout"

export default function Page() {
  return <SettingsLayout />
}
