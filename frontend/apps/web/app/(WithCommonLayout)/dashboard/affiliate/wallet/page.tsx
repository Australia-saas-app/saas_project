import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet",
};

import AffiliateWalletLayout from "@/src/modules/dashboard/affiliate/components/AffiliateWalletLayout"

export default function AffiliateWalletPage() {
  return <AffiliateWalletLayout />
}
