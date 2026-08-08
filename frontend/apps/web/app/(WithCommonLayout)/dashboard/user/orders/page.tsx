import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Orders",
};

import UserOrdersLayout from "@/src/modules/dashboard/user/components/UserOrdersLayout"

export default function UserOrdersPage() {
  return <UserOrdersLayout />
}
