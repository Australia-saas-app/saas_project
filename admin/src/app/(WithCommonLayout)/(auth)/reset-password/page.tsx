"use client"

import { useRouter } from "next/navigation"
import { ResetPasswordPage } from "@/src/business/account/components/reset-password-page"


export default function ResetPasswordPageRoute() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push(`/success`)
  }

  return <ResetPasswordPage onSuccess={handleSuccess} />
}
