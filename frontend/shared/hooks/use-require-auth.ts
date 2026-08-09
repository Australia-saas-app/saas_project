"use client"

import { useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/src/context/user.provider"

export function useRequireAuth() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const pathname = usePathname()

  let rolePath = "user";
  if (pathname.includes("/dashboard/business")) rolePath = "business";
  if (pathname.includes("/dashboard/affiliate")) rolePath = "affiliate";
  if (pathname.includes("/admin")) rolePath = "admin";
  
  const loginUrl = rolePath === "admin"
    ? `/account/admin/login?redirect=${encodeURIComponent(pathname)}`
    : `/account/${rolePath}/login?redirect=${encodeURIComponent(pathname)}`;

  const requireAuth = useCallback(
    (action: () => void) => {
      if (isLoading) return false
      if (!user) {
        router.push(loginUrl)
        return false
      }
      action()
      return true
    },
    [isLoading, user, router, loginUrl]
  )

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    loginUrl,
    requireAuth,
  }
}
