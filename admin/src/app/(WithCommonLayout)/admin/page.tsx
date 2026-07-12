"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { OnboardingFlow } from "@/src/business/account/components/onboarding-flow"
import { VerificationPage } from "@/src/business/account/components/verification-page"
import { SuccessPage } from "@/src/business/account/components/success-page"
import { ForgotPasswordPage } from "@/src/business/account/components/forgot-password-page"
import { ForgotPasswordVerifyPage } from "@/src/business/account/components/forgot-password-verify-page"
import { ResetPasswordPage } from "@/src/business/account/components/reset-password-page"
import { LoginPage } from "@/src/business/account/components/login-page"
import { LoadingScreen } from "@/src/business/account/components/loading-screen"

type PageType =
  | "login"
  | "onboarding"
  | "verification"
  | "success"
  | "forgot-password"
  | "forgot-verify"
  | "reset-password"
  | "loading"

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>("login")

  const [formData, setFormData] = useState({})
  const [forgotEmail, setForgotEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/login")
  }, [router])

  const handlePageChange = (page: PageType, data?: any) => {
    if (data) setFormData((prev) => ({ ...prev, ...data }))
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {currentPage === "login" && (
        <LoginPage
          onForgotPassword={() => handlePageChange("forgot-password")}
          onSuccess={() => handlePageChange("loading")}
        />
      )}
      {currentPage === "loading" && <LoadingScreen />}
      {currentPage === "onboarding" && (
        <OnboardingFlow
          initialData={formData}
          onNext={(data) => handlePageChange("verification", data)}
        />
      )}
      {currentPage === "verification" && <VerificationPage onSuccess={() => handlePageChange("success")} />}
      {currentPage === "success" && <SuccessPage onDone={() => handlePageChange("login")} />}
      {currentPage === "forgot-password" && (
        <ForgotPasswordPage
          onNext={(email) => {
            setForgotEmail(email)
            handlePageChange("forgot-verify")
          }}
          onBackToLogin={() => handlePageChange("login")}
        />
      )}
      {currentPage === "forgot-verify" && (
        <ForgotPasswordVerifyPage
          email={forgotEmail}
          onSuccess={() => handlePageChange("reset-password")}
          onBackToLogin={() => handlePageChange("login")}
        />
      )}
      {currentPage === "reset-password" && <ResetPasswordPage onSuccess={() => handlePageChange("success")} />}
    </div>
  )
}
