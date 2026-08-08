import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Earnings",
};

import EarningsLayout from "@/src/modules/dashboard/user/components/EarningsLayout"

export default function Page() {
  return <EarningsLayout />
}
