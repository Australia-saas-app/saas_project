import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

import React from "react"
import ProfileLayout from "@/src/modules/dashboard/affiliate/components/ProfileLayout"

export default function AffiliateProfilePage() {
  return <ProfileLayout />
}
