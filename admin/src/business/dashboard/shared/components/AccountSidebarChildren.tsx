"use client"

import { Button } from "@/src/shared/ui/ui/button"
import { 
  ChevronRight, LayoutDashboard, Users, FileText, ShoppingBag, 
  CreditCard, FolderOpen, MessageSquare, Bell, BarChart2, 
  PieChart, LineChart, Settings, Link as LinkIcon, ScrollText, 
  Crown, MoreVertical, Hexagon, LogOut, Database, Briefcase,
  ArrowUpRight
} from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/src/core/store/hooks"
import { logout } from "@/src/core/store/slices/authSlice"
import { useQueryClient } from "@tanstack/react-query"
import { motion, AnimatePresence } from "framer-motion"
import { hasPermission, Permission, UserRole } from "@/src/core/authentication/utils/rbac"
import { ShieldCheck } from "lucide-react"
import axiosInstanceClient from "@/src/infra/lib/axiosInstance/client"

const AccountSidebarChildren = ({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const token = useAppSelector((state) => state.auth.token)
  const role = user?.role as UserRole | undefined

  const [kycCount, setKycCount] = useState(0)
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0)

  useEffect(() => {
    let active = true
    const fetchKycCount = async () => {
      if (!token) return
      try {
        // Use limit=all to count all pending KYC applications without pagination limit
        const response = await fetch('/admin/api/sso/auth/admin/users?limit=all', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) return
        const resData = await response.json()
        if (!active) return
        const allUsers = resData.data?.users || resData.data || []
        const count = allUsers.filter((u: any) => {
          const k = String(u.kycStatus || '').toLowerCase()
          return k === 'pending' || k === 'submitted'
        }).length
        setKycCount(count)
      } catch (error) {
        console.error("Failed to fetch KYC count", error)
      }
    }
    fetchKycCount()
    const interval = setInterval(fetchKycCount, 5000) // update every 5s for near-instant badge updates
    // Instantly update badge when an admin approves / rejects an application
    const handleKycUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.kycStatus && (detail.kycStatus === 'approved' || detail.kycStatus === 'rejected')) {
        setKycCount(prev => Math.max(0, prev - 1));
      }
    };
    // If a user is deleted, their KYC application is gone too — decrement the badge
    const handleUserDeleted = () => {
      setKycCount(prev => Math.max(0, prev - 1));
    };
    window.addEventListener("vero:kyc_updated", handleKycUpdate)
    window.addEventListener("vero:user_deleted", handleUserDeleted)
    return () => {
      active = false
      clearInterval(interval)
      window.removeEventListener("vero:kyc_updated", handleKycUpdate)
      window.removeEventListener("vero:user_deleted", handleUserDeleted)
    }
  }, [token])

  // Real-time tracking of pending withdrawal requests
  useEffect(() => {
    let active = true;

    const fetchPendingWithdrawals = async () => {
      try {
        const effectiveToken =
          token ||
          (typeof window !== "undefined"
            ? localStorage.getItem("accessToken") || localStorage.getItem("token")
            : null);
        if (!effectiveToken) return;

        let count = 0;
        let fetched = false;
        const authHeader = effectiveToken.startsWith("Bearer ")
          ? effectiveToken
          : `Bearer ${effectiveToken}`;

        // 1. Fetch real withdrawals from SSO backend
        try {
          const res = await axiosInstanceClient.get("/sso/wallet/admin/withdrawals", {
            headers: { Authorization: authHeader },
            timeout: 5000,
          });
          const data =
            res.data?.data?.transactions ||
            res.data?.data ||
            res.data?.withdrawals ||
            res.data ||
            [];
          if (Array.isArray(data)) {
            const pendingRows = data.filter((w: any) => {
              const s = String(w.status || "").toLowerCase();
              const t = String(w.type || "").toUpperCase();
              const isWithdraw = !t || t.includes("WITHDRAW");
              return isWithdraw && s === "pending";
            });
            count = pendingRows.length;
            fetched = true;
          }
        } catch (err: any) {
          // If admin endpoint fails, try transactions fallback
          try {
            const res = await axiosInstanceClient.get(
              "/sso/wallet/transactions?all=true&type=withdrawal",
              {
                headers: { Authorization: authHeader },
                timeout: 5000,
              }
            );
            const data =
              res.data?.data?.transactions ||
              res.data?.data ||
              res.data?.withdrawals ||
              res.data ||
              [];
            if (Array.isArray(data)) {
              const pendingRows = data.filter((w: any) => {
                const s = String(w.status || "").toLowerCase();
                const t = String(w.type || "").toUpperCase();
                const isWithdraw = !t || t.includes("WITHDRAW");
                return isWithdraw && s === "pending";
              });
              count = pendingRows.length;
              fetched = true;
            }
          } catch {}
        }

        // 1b. If count is still 0, try unfiltered transactions
        if (count === 0) {
          try {
            const res = await axiosInstanceClient.get(
              "/sso/wallet/transactions?all=true",
              {
                headers: { Authorization: authHeader },
                timeout: 5000,
              }
            );
            const data =
              res.data?.data?.transactions ||
              res.data?.data ||
              res.data?.withdrawals ||
              res.data ||
              [];
            if (Array.isArray(data)) {
              const pendingRows = data.filter((w: any) => {
                const s = String(w.status || "").toLowerCase();
                const t = String(w.type || "").toUpperCase();
                const isWithdraw = !t || t.includes("WITHDRAW");
                return isWithdraw && s === "pending";
              });
              if (pendingRows.length > 0) {
                count = pendingRows.length;
                fetched = true;
              }
            }
          } catch {}
        }

        // 2. Also check local requests from user session
        if (typeof window !== "undefined") {
          try {
            const raw = localStorage.getItem("platform_wallet_withdrawals");
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const localPending = list.filter((w: any) => {
                  const s = String(w.status || "").toLowerCase();
                  return s === "pending";
                }).length;
                if (!fetched || localPending > count) {
                  count = localPending;
                }
              }
            }
          } catch {}
        }

        if (active) {
          setPendingWithdrawalsCount(count);
        }
      } catch {}
    };

    fetchPendingWithdrawals();
    const interval = setInterval(fetchPendingWithdrawals, 5000);

    const handleWithdrawalUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (typeof detail?.count === "number") {
        setPendingWithdrawalsCount(detail.count);
      } else {
        setPendingWithdrawalsCount((prev) => Math.max(0, prev - 1));
      }
    };

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "vero:withdrawal_updated") {
            if (typeof event.data?.count === "number") {
              setPendingWithdrawalsCount(event.data.count);
            } else {
              setPendingWithdrawalsCount((prev) => Math.max(0, prev - 1));
            }
          }
        };
      }
    } catch {}

    window.addEventListener("vero:withdrawal_updated", handleWithdrawalUpdated);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("vero:withdrawal_updated", handleWithdrawalUpdated);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
  }, []);

  const handleLogout = () => {
    queryClient.clear()
    dispatch(logout())
    // Clear the session flag so the dashboard loader shows on next login
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_dashboard_loaded")
    }
    router.replace("/login")
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  // Grouped Menu Items matching the image structure
  const menuGroups = [
    {
      title: "ACCOUNTS",
      items: [
        { label: "Users",     href: `/all-users`, icon: Users },
        { label: "Affiliate", href: `/all-affiliates`, icon: LinkIcon },
        { label: "Business",  href: `/all-businesses`, icon: Crown },
      ]
    },
    {
      title: "MANAGEMENT",
      items: [
        { label: "Wallet",       href: `/wallet`, icon: CreditCard },
        { label: "Currency",     href: `/currency`, icon: Database },
        { label: "Admin",        href: `/admin`, icon: Crown },
      ]
    },
    {
      title: "SERVICES",
      items: [
        { label: "Service",      href: `/service`,    icon: ShoppingBag },
        { label: "Technical",    href: `/technical`,  icon: BarChart2 },
        { label: "Real Estate",  href: `/real-estate`, icon: Hexagon },
        { label: "Visa Travel",  href: `/visa-travel`, icon: ScrollText },
        { label: "Courses",      href: `/courses`,     icon: FolderOpen },
        { label: "Careers",      href: `/careers`,     icon: Briefcase },
        { label: "Transport",    href: `/transport`,   icon: LineChart },
        { label: "Marketplace",  href: `/marketplace`, icon: ShoppingBag },
      ]
    },
    {
      title: "OPERATIONS",
      items: [
        { label: "Payment",             href: `/payment`,             icon: CreditCard },
        { label: "Withdrawal Requests", href: `/withdrawal-requests`, icon: ArrowUpRight, badge: pendingWithdrawalsCount },
        { label: "Orders",              href: `/gallery`,             icon: ShoppingBag },
        { label: "Return",              href: `/return`,              icon: MoreVertical },
        { label: "Monitoring",          href: `/monitoring`,          icon: LineChart },
        { label: "Files",               href: `/files`,               icon: FolderOpen },
      ]
    },
    {
      title: "ANALYTICS",
      items: [
        { label: "Category",     href: `#`, icon: PieChart },
        { label: "Platform",     href: `#`, icon: BarChart2 },
        { label: "Reports",      href: `#`, icon: FileText },
      ]
    },
    {
      title: "SYSTEM",
      items: [
        { label: "Notifications", href: `/notifications`, icon: Bell },
        { label: "System Logs",   href: `#`, icon: ScrollText },
        { label: "Support",       href: `#`, icon: MessageSquare },
      ]
    },
  ]

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
  }

  return (
    <div className={`relative transition-all duration-500 ease-in-out flex flex-col h-full bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 w-full`}>
      {/* Toggle Button */}
      <div className="absolute -right-3.5 top-20 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="bg-blue-600 text-white p-1 rounded-full shadow-sm border border-blue-600 flex items-center justify-center hover:bg-blue-700"
        >
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronRight size={16} />
          </motion.div>
        </motion.button>
      </div>

      {/* Logo Section */}
      <div className={`p-6 pb-6 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 flex items-center ${isOpen ? 'gap-3 justify-between' : 'justify-center'} `}>
        <div className="flex items-center gap-3 relative z-10">
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative flex items-center justify-center w-12 h-12 shrink-0 cursor-pointer"
          >
            <Image src="/admin/logo_1.png" alt="Logo" width={48} height={48} style={{ height: "auto" }} className="object-contain" />
          </motion.div>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <h3 className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">System Database</h3>
                <p className="text-[11px] text-slate-400 font-medium">Maritime Project</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Separated Dashboard & Overview Buttons */}
      <div className={`px-4 pt-4 pb-2 space-y-1`}>
        <Link href="/dashboard" title={!isOpen ? "Dashboard" : undefined}>
          <div className={`relative flex items-center ${isOpen ? 'px-4' : 'justify-center px-0'} py-3 rounded-2xl transition-all duration-300 ${
            (pathname === '/dashboard' || pathname === '/') 
              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'
          }`}>
            <LayoutDashboard size={20} className="shrink-0" />
            {isOpen && (
              <span className="font-bold text-[14px] ml-3 whitespace-nowrap animate-in fade-in zoom-in duration-200">
                Dashboard
              </span>
            )}
          </div>
        </Link>
        <Link href="/overview" title={!isOpen ? "Overview" : undefined}>
          <div className={`relative flex items-center ${isOpen ? 'px-4' : 'justify-center px-0'} py-3 rounded-2xl transition-all duration-300 ${
            (isActive('/overview')) 
              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'
          }`}>
            <PieChart size={20} className="shrink-0" />
            {isOpen && (
              <span className="font-bold text-[14px] ml-3 whitespace-nowrap animate-in fade-in zoom-in duration-200">
                Overview
              </span>
            )}
          </div>
        </Link>
        <Link href="/kyc-queue" title={!isOpen ? "KYC Queue" : undefined}>
          <div className={`relative flex items-center ${isOpen ? 'px-4' : 'justify-center px-0'} py-3 rounded-2xl transition-all duration-300 ${
            (isActive('/kyc-queue')) 
              ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'
          }`}>
            <div className="relative shrink-0 flex">
              <ShieldCheck size={20} />
              {!isOpen && kycCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow-sm min-w-[16px] text-center">
                  {kycCount}
                </span>
              )}
            </div>
            {isOpen && (
              <div className="flex items-center justify-between flex-1 ml-3 overflow-hidden">
                <span className="font-bold text-[14px] whitespace-nowrap animate-in fade-in zoom-in duration-200">
                  KYC Queue
                </span>
                {kycCount > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
                    {kycCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 sidebar-scrollbar overflow-x-hidden">
        {menuGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {isOpen && (
              <p className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-2 px-3 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <nav className="space-y-0.5">
              {group.items.filter((item: any) => item.permission ? hasPermission(role, item.permission) : true).map((item, index) => {
                const active = isActive(item.href)
                const badgeCount = Number((item as any).badge || 0)
                return (
                  <Link key={item.label} href={item.href} title={!isOpen ? item.label : undefined}>
                    <div 
                      className={`relative flex items-center justify-between ${isOpen ? 'px-3' : 'justify-center px-0'} py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0 flex items-center justify-center">
                          <item.icon size={18} className={`${active ? "text-white" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"} shrink-0 transition-colors`} />
                          {!isOpen && badgeCount > 0 && (
                            <span className="absolute -top-2 -right-2.5 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full shadow-sm min-w-[15px] h-[15px] flex items-center justify-center leading-none">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </div>
                        {isOpen && (
                          <span className="font-medium text-[13px] whitespace-nowrap animate-in fade-in zoom-in duration-200">
                            {item.label}
                          </span>
                        )}
                      </div>

                      {isOpen && badgeCount > 0 && (
                        <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0 min-w-[20px] text-center">
                          {badgeCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Watermark Footer */}
      {isOpen && (
        <div className="p-5 pt-4 border-t border-gray-200 dark:border-gray-800 mt-auto flex flex-col items-center justify-center text-center">
          <p className="text-[11px] text-blue-600 font-medium">
            © 2026 All Rights Reserved
          </p>
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-1">
            Maritime Project
          </p>
        </div>
      )}

    </div>
  )
}

export default AccountSidebarChildren