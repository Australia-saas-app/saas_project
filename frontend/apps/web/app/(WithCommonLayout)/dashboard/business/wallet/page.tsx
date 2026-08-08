import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet",
};

import BusinessWalletLayout from "@/src/modules/dashboard/business/components/BusinessWalletLayout"

export default function BusinessWalletPage() {
  return <BusinessWalletLayout />
}
