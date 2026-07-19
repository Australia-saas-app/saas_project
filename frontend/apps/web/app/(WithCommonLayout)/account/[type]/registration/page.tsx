"use client"

import { useEffect } from "react"
import { SignupPage } from "@/src/modules/account/components/signup-page"
import { clearSignupDraft, saveSignupDraft } from "@/src/constants/signup-session"
import { useParams, useRouter } from "next/navigation"
import { registerUser } from "@/src/server/AuthService"

type AccountType = "user" | "affiliate" | "business"

export default function RegistrationPageRoute() {
  const params = useParams()
  const router = useRouter()
  const accountType = (params.type as AccountType) || "user"

  useEffect(() => {
    clearSignupDraft(accountType)
  }, [accountType])

  const handleNext = async (data: Record<string, unknown>) => {
    // Call backend to create pending account and send OTP
    const isEmail = String(data.contact).includes("@");
    const payload = {
      ...data,
      accountType,
      email: isEmail ? data.contact : undefined,
      phone: !isEmail ? data.contact : undefined,
    };
    
    await registerUser(payload);
    
    // Progressive signup: verify contact first; full profile happens after login.
    saveSignupDraft(accountType, data)
    router.push(`/account/${accountType}/verification`)
  }

  const handleAccountTypeChange = (newType: AccountType) => {
    router.push(`/account/${newType}/registration`)
  }

  return (
    <SignupPage accountType={accountType} onNext={handleNext} onAccountTypeChange={handleAccountTypeChange} />
  )
}
