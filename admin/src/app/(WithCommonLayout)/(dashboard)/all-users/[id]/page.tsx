"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import ProfilePageLayout from "@/src/business/dashboard/allUsers/components/ProfilePageLayout"
import { userService } from "@/src/business/dashboard/services/platform"

type BackendUser = {
  userId: string
  accountType?: string
  fullName?: string
  email?: string
  phone?: string | null
  currency?: string
  kycStatus?: string
  profilePhoto?: string | null
  dateOfBirth?: string | null
  nationality?: string | null
  governmentId?: string | null
  idDocument?: string | null
  status?: string
  createdAt?: string
  updatedAt?: string
}

export default function UserDetailsPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const [user, setUser] = useState<BackendUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchUser = async () => {
      if (!id) return
      setLoading(true)
      const u = await userService.getUser(id)
      if (!active) return
      setUser(u)
      setLoading(false)
    }
    fetchUser()
    return () => { active = false }
  }, [id])

  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <div className="p-6">User not found</div>

  return (
    <ProfilePageLayout
      affiliateId={user.userId}
      fullName={user.fullName}
      status={(user.status || "").toUpperCase() as any}
      joiningDate={user.createdAt}
      email={user.email}
      nationality={user.nationality || undefined}
      dateOfBirth={user.dateOfBirth || undefined}
      nationalIdentity={user.governmentId || undefined}
      phoneNumber={user.phone || undefined}
      secondaryEmail={undefined}
      preferredCurrency={user.currency ? `${user.currency}` : undefined}
      profileImage={user.profilePhoto || undefined}
      scanFaceImage={undefined}
      passportImage={undefined}
      isVerified={user.kycStatus === 'APPROVED' || user.kycStatus === 'approved'}
    />
  )
}