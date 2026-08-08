import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

import AffiliateDashboardLayout from "@/src/modules/dashboard/affiliate/components/AffiliateDashboardLayout"

const Page = () => {
  return <AffiliateDashboardLayout />
}

export default Page
