import type React from "react"
import AccountLayoutComponent from "@/src/business/account/components/AccountLayout"

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutComponent>{children}</AccountLayoutComponent>
}
