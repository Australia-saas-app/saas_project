import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages",
};

import AffiliateMessagesLayout from "@/src/modules/dashboard/affiliate/components/AffiliateMessagesLayout"

export default function AffiliateMessagesPage() {
  return <AffiliateMessagesLayout />
}
