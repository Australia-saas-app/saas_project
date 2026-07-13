"use client"

import { useRouter } from "next/navigation"
import { ForgotPasswordPage } from "@/src/business/account/components/forgot-password-page"



export default function ForgotPasswordPageRoute() {
  const router = useRouter()


  const handleNext = (email: string) => {
    const encodedEmail = btoa(email)
    router.push(`/admin/forgot-password-verify?email=${encodedEmail}`)
  }

  const handleBackToLogin = () => {
    router.push(`/admin/login`)
  }

  return <ForgotPasswordPage onNext={handleNext} onBackToLogin={handleBackToLogin} />
}
