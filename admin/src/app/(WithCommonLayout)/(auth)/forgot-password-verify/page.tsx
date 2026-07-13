"use client"

import { ForgotPasswordVerifyPage } from "@/src/business/account/components/forgot-password-verify-page"
import { useRouter, useSearchParams } from "next/navigation"

// Force dynamic rendering so Vercel emits a lambda for this route
export const dynamic = "force-dynamic"


export default function ForgotPasswordVerifyPageRoute() {
  const router = useRouter()
  const searchParams = useSearchParams()


  const encodedEmail = searchParams.get("email")
  const email = encodedEmail ? atob(encodedEmail) : ""

  const handleSuccess = () => {
    router.push(`/reset-password`)
  }

  const handleBackToLogin = () => {
    router.push(`/login`)
  }

  return <ForgotPasswordVerifyPage email={email} onSuccess={handleSuccess} onBackToLogin={handleBackToLogin} />
}
