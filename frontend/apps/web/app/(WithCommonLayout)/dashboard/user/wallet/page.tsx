import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wallet",
};

import UserWalletLayout from "@/src/modules/dashboard/user/components/UserWalletLayout"

export default function UserWalletPage() {
  return <UserWalletLayout />
}
