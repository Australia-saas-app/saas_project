"use client"

import type { ReactNode } from "react"
import Header from "@/src/modules/shared/header"
import MobileBottomNav from "@/src/modules/shared/components/search/MobileBottomNav"

interface AccountLayoutProps {
  children: ReactNode
}

function AccountLayout({ children }: AccountLayoutProps) {
  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <div className="hidden lg:block shrink-0">
        <Header />
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto lg:overflow-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  )
}

export default AccountLayout
