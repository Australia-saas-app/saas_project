"use client"

import {  useRouter } from "next/navigation"
import { VerificationPage } from "@/src/business/account/components/verification-page"


export default function VerificationPageRoute() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push(`/admin/success`)
  }

  return <VerificationPage onSuccess={handleSuccess} />
}
