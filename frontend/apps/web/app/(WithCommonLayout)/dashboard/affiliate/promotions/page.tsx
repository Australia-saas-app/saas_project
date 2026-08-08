import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Promotions",
};

import AffiliatePromotionsLayout from "@/src/modules/dashboard/affiliate/components/AffiliatePromotionsLayout"

export default function AffiliatePromotionsPage() {
  return <AffiliatePromotionsLayout />
}
