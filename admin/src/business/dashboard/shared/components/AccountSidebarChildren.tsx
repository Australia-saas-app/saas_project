"use client"

import { Button } from "@/src/shared/ui/ui/button"
import { 
  ChevronRight, LayoutDashboard, Users, FileText, ShoppingBag, 
  CreditCard, FolderOpen, MessageSquare, Bell, BarChart2, 
  PieChart, LineChart, Settings, Link as LinkIcon, ScrollText, 
  Crown, MoreVertical, Hexagon, LogOut, Database, Briefcase
} from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@/src/core/store/hooks"
import { logout } from "@/src/core/store/slices/authSlice"
import { motion, AnimatePresence } from "framer-motion"
import { hasPermission, Permission, UserRole } from "@/src/core/authentication/utils/rbac"

const AccountSidebarChildren = ({ isOpen, onToggle }: { isOpen: boolean, onToggle: () => void }) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const role = user?.role as UserRole | undefined

  const handleLogout = () => {
    dispatch(logout())
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
        { label: "KYC Review",   href: `/kyc-queue`, icon: FileText, permission: "approve_kyc" as Permission },
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
        { label: "Payment",      href: `/payment`, icon: CreditCard },
        { label: "Orders",       href: `/gallery`, icon: ShoppingBag },
        { label: "Return",       href: `/return`, icon: MoreVertical },
        { label: "Monitoring",   href: `/monitoring`, icon: LineChart },
        { label: "Files",        href: `/files`, icon: FolderOpen },
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
        { label: "Notifications", href: `#`, icon: Bell },
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
            <Image src="/logo_1.png" alt="Logo" width={48} height={48} style={{ height: "auto" }} className="object-contain" />
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
              {group.items.filter(item => item.permission ? hasPermission(role, item.permission) : true).map((item, index) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.label} href={item.href} title={!isOpen ? item.label : undefined}>
                    <div 
                      className={`relative flex items-center justify-between ${isOpen ? 'px-3' : 'justify-center px-0'} py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} className={`${active ? "text-white" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"} shrink-0 transition-colors`} />
                        {isOpen && (
                          <span className="font-medium text-[13px] whitespace-nowrap animate-in fade-in zoom-in duration-200">
                            {item.label}
                          </span>
                        )}
                      </div>

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