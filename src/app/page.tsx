"use client";
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/src/core/store/hooks'

import { LoadingScreen } from '@/src/business/account/components/loading-screen'

const Page = () => {
  const { isAuthenticated, token, loading } = useAppSelector((state) => state.auth)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading) {
      router.replace('/account/login')
    }
  }, [mounted, loading, router])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
      <LoadingScreen title="Redirecting" subtitle="Taking you to the login page..." destination="" />
    </div>
  )
}

export default Page