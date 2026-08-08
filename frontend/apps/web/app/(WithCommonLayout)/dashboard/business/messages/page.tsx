import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

import BusinessMessagesLayout from "@/src/modules/dashboard/business/components/BusinessMessagesLayout"

export default function BusinessMessagesPage() {
  return <BusinessMessagesLayout />
}
