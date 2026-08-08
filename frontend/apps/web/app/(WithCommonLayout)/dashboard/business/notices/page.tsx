import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notices",
};

import BusinessNoticesLayout from "@/src/modules/dashboard/business/components/BusinessNoticesLayout"

export default function BusinessNoticesPage() {
  return <BusinessNoticesLayout />
}
