import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
};

import BusinessServicesLayout from "@/src/modules/dashboard/business/components/BusinessServicesLayout"

export default function BusinessServicesPage() {
  return <BusinessServicesLayout />
}
