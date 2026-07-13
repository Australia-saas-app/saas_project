"use client"
import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { LoginPage } from "@/src/business/account/components/login-page"
import { LoadingScreen } from "@/src/business/account/components/loading-screen"

type AccountType = "admin" | "sub-admin" | "super-admin"

export default function LoginPageRoute() {
  const params = useParams()
  const router = useRouter()
  const [showLoading, setShowLoading] = useState(false)
  const accountType = (params.type as AccountType) || "admin"

  if (showLoading) {
    return <LoadingScreen />
  }

  return (
    <LoginPage
      onSignup={() => router.push(`/registration`)}
      onForgotPassword={() => router.push(`/forgot-password`)}
      onSuccess={() => {
        setShowLoading(true)
      }}
    />
  )
}
