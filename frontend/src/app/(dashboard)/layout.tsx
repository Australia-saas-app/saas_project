"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/core/auth/context/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const isRider = user?.roles?.includes("rider");
  const isAgency = user?.roles?.includes("agency");
  const hasBusinessProfile = isRider || isAgency;

  const isRiderView = pathname.startsWith("/businesses/rider");

  // Helper function to determine active state
  const isActive = (path: string) => {
    if (path === "/home" && (pathname === "/" || pathname === "/home")) return true;
    if (path !== "/home" && pathname.startsWith(path)) return true;
    return false;
  };

  const getLinkClass = (path: string) => {
    return `flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-lg font-medium transition-colors group relative ${
      isActive(path)
        ? "bg-slate-900 text-white shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;
  };

  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-[family-name:var(--font-geist-sans)]">
      {/* Sidebar Navigation */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 border-r border-slate-200 bg-white flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30 relative`}>
        
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm z-40 transition-transform"
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className={`p-6 border-b border-slate-200 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 whitespace-nowrap overflow-hidden">
            {isCollapsed ? (isRiderView ? "RP" : "CP") : (isRiderView ? "Rider Panel" : "Customer Panel")}
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {isRiderView ? (
            /* Rider Navigation */
            <>
              <div className="mb-6">
                <Link href="/businesses/rider" className={getLinkClass("/businesses/rider")} title={isCollapsed ? "Ride Radar" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {!isCollapsed && <span className="truncate">Ride Radar</span>}
                </Link>
                <Link href="/businesses/rider/earnings" className={getLinkClass("/businesses/rider/earnings") + " mt-1"} title={isCollapsed ? "Earnings" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {!isCollapsed && <span className="truncate">Earnings</span>}
                </Link>
              </div>
            </>
          ) : (
            /* Customer Navigation */
            <>
              {/* Main Hub */}
              <div className="mb-6">
                <Link href="/home" className={getLinkClass("/home")} title={isCollapsed ? "Service Hub" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  {!isCollapsed && <span className="truncate">Service Hub</span>}
                </Link>
              </div>

              {/* Provider / Business Navigation */}
              {hasBusinessProfile && (
                <div className="mb-6">
                  {!isCollapsed && <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Business</p>}
                  
                  {isRider && (
                    <Link href="/businesses/rider" className={getLinkClass("/businesses/rider")} title={isCollapsed ? "Rider Control Center" : ""}>
                      <div className="w-5 h-5 shrink-0 rounded-md bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white text-[10px] shadow-sm">R</div>
                      {!isCollapsed && <span className="truncate">Rider Control Center</span>}
                    </Link>
                  )}
                  
                  {isAgency && (
                    <Link href="/businesses" className={getLinkClass("/businesses")} title={isCollapsed ? "Agency Dashboard" : ""}>
                      <div className="w-5 h-5 shrink-0 rounded-md bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-[10px] shadow-sm">A</div>
                      {!isCollapsed && <span className="truncate">Agency Dashboard</span>}
                    </Link>
                  )}
                </div>
              )}

              {/* Marketplace Navigation */}
              <div className="mb-6">
                {!isCollapsed && <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Marketplace</p>}
                <Link href="/projects" className={getLinkClass("/projects")} title={isCollapsed ? "My Projects" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {!isCollapsed && <span className="truncate">My Projects</span>}
                </Link>
                <Link href="/discover" className={getLinkClass("/discover")} title={isCollapsed ? "Discover Businesses" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {!isCollapsed && <span className="truncate">Discover Businesses</span>}
                </Link>
                <Link href="/wallet" className={getLinkClass("/wallet")} title={isCollapsed ? "Wallet & Escrow" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                  {!isCollapsed && <span className="truncate">Wallet & Escrow</span>}
                </Link>
              </div>

              {/* Account Settings Navigation */}
              <div>
                {!isCollapsed && <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Account Settings</p>}
                <Link href="/profile" className={getLinkClass("/profile")} title={isCollapsed ? "Profile" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {!isCollapsed && <span className="truncate">Profile</span>}
                </Link>
                <Link href="/kyc" className={getLinkClass("/kyc")} title={isCollapsed ? "Identity (KYC)" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  {!isCollapsed && <span className="truncate">Identity (KYC)</span>}
                </Link>
                <Link href="/security" className={getLinkClass("/security")} title={isCollapsed ? "Security" : ""}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  {!isCollapsed && <span className="truncate">Security</span>}
                </Link>
              </div>
            </>
          )}
        </nav>

        <div className={`p-4 border-t border-slate-200 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <Link href="/" onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("mock_user");
            }
          }} className={`flex items-center ${isCollapsed ? 'justify-center px-0 w-10' : 'gap-3 px-3 w-full text-left'} py-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors font-medium`} title={isCollapsed ? "Sign Out" : ""}>
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            {!isCollapsed && <span>Sign Out</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative custom-scrollbar">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          <div className="text-slate-500 text-sm font-medium">Dashboard Overview</div>
          <div className="flex items-center gap-6">
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {/* Unread badge */}
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 z-50">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900">Notifications</h3>
                    <button className="text-xs text-blue-600 font-medium hover:underline">Mark all read</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer opacity-100 bg-blue-50/50">
                      <p className="text-sm text-slate-900 font-medium">New Message in <span className="font-bold">Website Design</span></p>
                      <p className="text-xs text-slate-500 mt-1">CreativeTech Ltd: "Hi there! I've reviewed the requirements..."</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">Just now</p>
                    </div>
                    <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                      <p className="text-sm text-slate-900 font-medium">Escrow Secured</p>
                      <p className="text-xs text-slate-500 mt-1">$100 has been securely locked in escrow for PRJ-1029.</p>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium">2 hours ago</p>
                    </div>
                  </div>
                  <div className="p-3 text-center border-t border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <span className="text-sm text-slate-600 font-medium">View all activity</span>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white shadow-md cursor-pointer">
              {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}
