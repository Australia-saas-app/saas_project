"use client"

import { Bell, MessageSquare, Sun, Search, User as UserIcon, LogOut, Settings, X, PhoneMissed } from "lucide-react"
import Image from "next/image"
import { useState, useRef, useEffect } from "react"
import { useAppDispatch } from "@/src/core/store/hooks"
import { logout } from "@/src/core/store/slices/authSlice"
import { useRouter } from "next/navigation"

interface TopBarProps {
  onMenuClick?: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  
  const dispatch = useAppDispatch()
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false)
      }
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsChatOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = () => {
    setIsLoggingOut(true)
    setTimeout(() => {
      setIsLogoutModalOpen(false)
      dispatch(logout())
      router.replace("/admin/login")
      setIsLoggingOut(false)
    }, 0)
  }

  return (
    <>
      <header className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-8 py-3 flex items-center justify-between sticky top-0 z-[100] w-full shadow-sm transition-all rounded-tl-[32px]">
        
        {/* Left: Search Bar */}
        <div className="flex-1 flex items-center">
          <div className="relative w-full max-w-md hidden sm:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/50 sm:text-sm transition-all shadow-inner"
              placeholder="Search anything..."
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-5">
          
          {/* Icons */}
          <div className="flex items-center gap-2">
            {/* Notification Dropdown */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen)
                  setIsDropdownOpen(false)
                }}
                className={`relative p-2 rounded-full transition-colors ${isNotifOpen ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'}`}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white dark:border-gray-900">
                  2
                </span>
              </button>
              
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-[340px] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                  <div className="p-5 flex justify-between items-start border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-white">Notifications</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">2 unread</p>
                    </div>
                    <button onClick={() => setIsNotifOpen(false)} className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-0.5">
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {/* Item 1 */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 cursor-pointer flex gap-4 relative transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                        <MessageSquare size={18} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 pr-4">
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">New message from Liam Anderson</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hi, I need help with my account</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">02:40 AM</p>
                      </div>
                      <div className="absolute right-4 top-5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                    </div>

                    {/* Item 2 */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 cursor-pointer flex gap-4 relative transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                        <MessageSquare size={18} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 pr-4">
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">New message from Lucas Williams</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Do you have any promotional offers?</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">02:30 AM</p>
                      </div>
                      <div className="absolute right-4 top-5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                    </div>

                    {/* Item 3 */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 cursor-pointer flex gap-4 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] border-2 border-white dark:border-slate-800"></div>
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Sophia Chen is now online</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">User is online</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">02:15 AM</p>
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 cursor-pointer flex gap-4 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-500/20 shadow-sm">
                        <PhoneMissed size={18} strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors">Missed voice call from Grace Miller</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Missed call</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">12:45 AM</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 text-center border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <button className="text-[13px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-all hover:scale-105">Mark all as read</button>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Icon (Routing only) */}
            <button 
              onClick={() => router.push('/live-chat')}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hidden sm:block"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white dark:border-gray-900">
                12
              </span>
            </button>

            {/* Theme Toggle */}
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
              <Sun className="w-5 h-5" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

          {/* Profile Container */}
          <div className="relative" ref={dropdownRef}>
            <div 
              onClick={() => {
                setIsDropdownOpen(!isDropdownOpen)
                setIsNotifOpen(false)
                setIsChatOpen(false)
              }}
              className={`flex items-center gap-3 cursor-pointer p-1.5 pr-4 rounded-full transition-all border shadow-sm ${
                isDropdownOpen 
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm border border-gray-100 dark:border-gray-700">
                <Image width={32} height={32} src={'https://lh3.googleusercontent.com/a-/ALV-UjUcIWda3ZrzBMAJl37_GUwH9bvPyroMBoqo3x1hKRyIO-LD96s=s240-p-k-rw-no'} alt={'Admin'} className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100 leading-none">Mr Jack</span>
                <span className="text-[11px] text-gray-500 font-medium mt-0.5">Admin</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`hidden sm:block transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-purple-600' : 'text-gray-400'}`}><polyline points="6 9 12 15 18 9"/></svg>
            </div>

            {/* Profile Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Mr Jack</p>
                  <p className="text-xs text-gray-500 truncate">admin@systemdb.com</p>
                </div>
                <div className="p-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors">
                    <UserIcon size={16} />
                    My Profile
                  </button>
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false)
                      router.push('/setting')
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                </div>
                <div className="p-1 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => {
                      setIsDropdownOpen(false)
                      setIsLogoutModalOpen(true)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div 
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full rounded-[24px] shadow-2xl p-7 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center"
            style={{ maxWidth: "380px" }}
          >
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-4">
              <LogOut size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2.5">Confirm Logout</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              Are you sure you want to log out of your session? You will need to log in again to access the dashboard.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              >
                No, Cancel
              </button>
              <button 
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 px-3 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/30 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:hover:bg-red-600"
              >
                {isLoggingOut ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Yes, Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
