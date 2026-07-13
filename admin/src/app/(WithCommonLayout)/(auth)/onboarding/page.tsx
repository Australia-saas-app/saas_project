"use client"

import { useRouter } from "next/navigation"
import { OnboardingFlow } from "@/src/business/account/components/onboarding-flow"


export default function OnboardingPageRoute() {
  const router = useRouter()

  const handleNext = () => {
    router.push(`/verification`)
  }

  return <OnboardingFlow  initialData={{}} onNext={handleNext} />
}
