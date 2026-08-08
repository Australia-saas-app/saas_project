import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notices",
};

import UserNoticesLayout from "@/src/modules/dashboard/user/components/UserNoticesLayout"

export default function UserNoticesPage() {
  return <UserNoticesLayout />
}
