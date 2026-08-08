import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

import BusinessDashboardLayout from "@/src/modules/dashboard/business/components/BusinessDashboardLayout"

const Page = () => {
  return <BusinessDashboardLayout />
}

export default Page
