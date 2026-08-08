import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Applications",
};

import UserApplicationsLayout from "@/src/modules/dashboard/user/components/UserApplicationsLayout"

export default function UserApplicationsPage() {
  return <UserApplicationsLayout />
}
