import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Referrals",
};

import AffiliateReferralsLayout from "@/src/modules/dashboard/affiliate/components/AffiliateReferralsLayout"

export default function AffiliateReferralsPage() {
  return <AffiliateReferralsLayout />
}
