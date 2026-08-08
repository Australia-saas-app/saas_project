import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

import UserMessagesLayout from "@/src/modules/dashboard/user/components/UserMessagesLayout"

export default function UserMessagesPage() {
  return <UserMessagesLayout />
}
