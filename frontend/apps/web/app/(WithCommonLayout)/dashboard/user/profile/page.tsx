import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

import dynamic from "next/dynamic"

const ProfileLayout = dynamic(
  () => import("@/src/modules/dashboard/user/components/ProfileLayout"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20 text-sm text-gray-500">
        Loading profile...
      </div>
    ),
  }
)

const Page = () => {
  return <ProfileLayout />
}

export default Page
