"use client"

import RoleProfileCard from "../../shared/components/profile/RoleProfileCard"
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account"

const BUSINESS_LEVELS = ["Intake", "Bronze", "Silver", "Gold", "Platinum", "Diamond"]

export default function BusinessProfilePageLayout() {
  const { isDemo } = useIsDemoAccount()

  return (
    <RoleProfileCard
      stats={
        isDemo
          ? [
              { label: "Current Level", value: "Diamond" },
              { label: "Rank", value: "T265" },
              { label: "Progress", value: "45.71%" },
            ]
          : [
              { label: "Current Level", value: "0" },
              { label: "Rank", value: "0" },
              { label: "Progress", value: "0%" },
            ]
      }
      levelProgress={
        isDemo
          ? {
              completedLabel: "5 of 6 levels",
              fillPercent: 55,
              milestones: BUSINESS_LEVELS,
              completedCount: 4,
            }
          : {
              completedLabel: "0 of 6 levels",
              fillPercent: 0,
              milestones: BUSINESS_LEVELS,
              completedCount: 0,
            }
      }
      showDocuments
    />
  )
}
