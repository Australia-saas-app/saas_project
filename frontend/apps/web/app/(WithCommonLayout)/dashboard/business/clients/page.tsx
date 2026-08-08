import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clients",
};

import BusinessClientsLayout from "@/src/modules/dashboard/business/components/BusinessClientsLayout"

export default function BusinessClientsPage() {
  return <BusinessClientsLayout />
}
