import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace",
};

import UserMarketplaceLayout from "@/src/modules/dashboard/user/components/UserMarketplaceLayout"

export default function UserMarketplacePage() {
  return <UserMarketplaceLayout />
}
