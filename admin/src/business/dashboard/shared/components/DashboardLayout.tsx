"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"
import AccountSidebarChildren from "./AccountSidebarChildren"
import { useAppSelector } from "@/src/core/store/hooks"
import { useRouter } from "next/navigation"
import { LoadingScreen } from "@/src/business/account/components/loading-screen"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [wasAuthenticated, setWasAuthenticated] = useState(false)
  const { isAuthenticated, token, loading } = useAppSelector((state) => state.auth)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      setWasAuthenticated(true)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (mounted && !isAuthenticated && !token && !loading) {
      if (wasAuthenticated) {
        setIsLoggingOut(true)
      } else {
        router.replace("/login")
      }
    }
  }, [mounted, isAuthenticated, token, loading, router, wasAuthenticated])

  if (isLoggingOut) {
    return (
      <div className="h-screen w-screen bg-background absolute inset-0 z-50 flex items-center justify-center">
        <LoadingScreen
          title="Signing Out"
          subtitle="Securing your data and closing session..."
          destination="/login"
        />
      </div>
    )
  }

  if (!mounted || loading || (!isAuthenticated && !token)) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)}>
        <AccountSidebarChildren onToggle={() => setSidebarOpen(!sidebarOpen)} isOpen={sidebarOpen} />
      </Sidebar>
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-gray-50 dark:bg-slate-900 border-l border-gray-200 dark:border-gray-800">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  )
}
