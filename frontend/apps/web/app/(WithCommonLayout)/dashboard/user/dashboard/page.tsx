import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

import UserDashboardLayout from "@/src/modules/dashboard/user/components/UserDashboardLayout"

export default function Page() {
  return <UserDashboardLayout />
}
