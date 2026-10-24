"use client"

import { useEffect } from "react"
import { SignupPage } from "@/src/modules/account/components/signup-page"
import { clearSignupDraft, saveSignupDraft } from "@/src/constants/signup-session"
import { useParams, useRouter } from "next/navigation"
import { registerUser } from "@/src/server/AuthService"
import { getOrCreateDeviceId } from "@/src/shared/lib/device-id"

type AccountType = "user" | "affiliate" | "business"

export default function RegistrationPageRoute() {
  const params = useParams()
  const router = useRouter()
  const accountType = (params.type as AccountType) || "user"

  useEffect(() => {
    clearSignupDraft(accountType)
  }, [accountType])

  const handleNext = async (data: Record<string, unknown>) => {
    const contactVal = typeof data.email === "string" ? data.email.trim() : (typeof data.contact === "string" ? data.contact.trim() : "");
    const isEmail = contactVal.includes("@");
    const deviceId = getOrCreateDeviceId();
    
    const payload = {
      ...data,
      accountType,
      deviceId,
      email: isEmail ? contactVal : undefined,
      phone: !isEmail ? contactVal : undefined,
    };
    
    const res = await registerUser(payload);
    
    if (res && !res.success) {
      throw new Error(res.message || "Registration failed");
    }
    
    router.push(`/account/${accountType}/login`)
  }

  const handleAccountTypeChange = (newType: AccountType) => {
    router.push(`/account/${newType}/registration`)
  }

  return (
    <SignupPage accountType={accountType} onNext={handleNext} onAccountTypeChange={handleAccountTypeChange} />
  )
}
