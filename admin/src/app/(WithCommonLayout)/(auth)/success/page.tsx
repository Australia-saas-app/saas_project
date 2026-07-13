"use client"

import { useRouter } from "next/navigation"
import { SuccessPage } from "@/src/business/account/components/success-page"


export default function SuccessPageRoute() {
  const router = useRouter()

  const handleDone = () => {
    router.push(`/login`)
  }

  return <SuccessPage onDone={handleDone} />
}
