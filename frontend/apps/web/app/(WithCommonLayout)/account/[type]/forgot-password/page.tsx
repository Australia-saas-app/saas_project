"use client"

import { useParams, useRouter } from "next/navigation"
import { ForgotPasswordPage } from "@/src/modules/account/components/forgot-password-page"

type AccountType = "user" | "affiliate" | "business"

export default function ForgotPasswordPageRoute() {
  const params = useParams()
  const router = useRouter()
  const accountType = (params.type as AccountType) || "user"

  const handleNext = (email: string) => {
    const encodedEmail = btoa(email)
    router.push(`/account/${accountType}/forgot-password-verify?email=${encodedEmail}`)
  }

  const handleBackToLogin = () => {
    router.push(`/account/${accountType}/login`)
  }

  return <ForgotPasswordPage onNext={handleNext} onBackToLogin={handleBackToLogin} accountType={accountType} />
}
