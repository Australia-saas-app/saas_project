import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notices",
};

import AffiliateNoticesLayout from "@/src/modules/dashboard/affiliate/components/AffiliateNoticesLayout"

export default function AffiliateNoticesPage() {
  return <AffiliateNoticesLayout />
}
