import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Earnings",
};

import AffiliateEarningsLayout from "@/src/modules/dashboard/affiliate/components/AffiliateEarningsLayout"

export default function AffiliateEarningsPage() {
  return <AffiliateEarningsLayout />
}
