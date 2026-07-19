"use client"

import { useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { VerificationPage } from "@/src/modules/account/components/verification-page"
import { verifyOtpAndLogin } from "@/src/server/AuthService"
import {
  clearSignupDraft,
  getSignupContactEmail,
  loadSignupDraft,
} from "@/src/constants/signup-session"

type AccountType = "user" | "affiliate" | "business"

export default function VerificationPageRoute() {
  const params = useParams()
  const router = useRouter()
  const accountType = (params.type as AccountType) || "user"
  const draft = useMemo(() => loadSignupDraft(accountType), [accountType])
  const email = getSignupContactEmail(draft)

  useEffect(() => {
    if (!draft.contact || !draft.password) {
      router.replace(`/account/${accountType}/registration`)
    }
  }, [accountType, draft.contact, draft.password, router])

  const handleSuccess = async (code: string) => {
    const signupData = loadSignupDraft(accountType)
    if (!signupData.contact || !signupData.password) {
      throw new Error("Signup data is missing. Please start registration again.")
    }

    const contactStr = String(signupData.contact);
    const isEmail = contactStr.includes("@");

    await verifyOtpAndLogin({
      email: isEmail ? contactStr : undefined,
      phone: !isEmail ? contactStr : undefined,
      otp: code,
      password: String(signupData.password),
      accountType: String(signupData.accountType ?? accountType),
    });

    clearSignupDraft(accountType)
    toast.success("Account verified. Complete your profile to unlock work features.")
    router.push(`/${accountType}/complete-profile`)
  }

  return <VerificationPage email={email} onSuccess={handleSuccess} />
}
