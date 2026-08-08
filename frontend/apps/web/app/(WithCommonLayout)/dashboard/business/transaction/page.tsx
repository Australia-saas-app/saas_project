import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaction",
};

import BusinessTransactionLayout from "@/src/modules/dashboard/business/components/BusinessTransactionLayout"

export default function BusinessTransactionPage() {
  return <BusinessTransactionLayout />
}
