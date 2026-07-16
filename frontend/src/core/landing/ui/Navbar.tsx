"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Bell, MessageSquare, ChevronDown, LogOut, Settings, User as UserIcon, Loader2, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/core/auth/context/AuthContext";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Feed", href: "#feed" },
  { label: "Services", href: "#services" },
  { label: "Notice", href: "#notice" },
  { label: "Our Team", href: "#team" },
  { label: "Associate", href: "#associate" },
  { label: "Branch", href: "#branch" },
  { label: "Blog", href: "#blog" },
];

interface NavbarProps {
  onSignUp?: () => void;
  showGetStarted?: boolean;
}

export function Navbar({ onSignUp, showGetStarted = true }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Simulate delay for spin
    await new Promise(resolve => setTimeout(resolve, 800));
    logout();
    setIsLoggingOut(false);
    setLogoutModalOpen(false);
  };

  return (
    <>
      <header className="w-full bg-white border-b border-slate-100 shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo | spacer | nav links + sign up — all in one row */}
        <div className="flex items-center h-16 gap-4">

          {/* Logo — bigger */}
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/logo_1.png"
              alt="Logo"
              width={52}
              height={52}
              className="w-12 h-12 object-contain"
              priority
            />
          </Link>

          {/* Spacer pushes everything else to the right */}
          <div className="flex-1" />

          {/* Desktop Nav Links + Sign up — grouped right */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 rounded-md transition-colors duration-150 relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 rounded-full group-hover:w-full transition-all duration-200" />
              </a>
            ))}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 lg:gap-3 ml-2 lg:ml-4 pl-2 lg:pl-4 border-l border-slate-200">
                {/* Notifications Icon */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    2
                  </span>
                </button>
                {/* Chat Icon */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                  <MessageSquare className="w-5 h-5" />
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    12
                  </span>
                </button>
                
                {/* Profile Pill */}
                <div className="relative ml-2" ref={profileRef}>
                  <button 
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 bg-[#f0f4ff] hover:bg-blue-50 border border-blue-100 rounded-full transition-colors"
                  >
                    <Image src="/userCard.png" alt="Profile" width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-white" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-bold text-slate-800 leading-tight">{user.name || "User"}</span>
                      <span className="text-[10px] text-slate-500 capitalize leading-tight">{user.roles?.[0] || "User"}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-slate-50 mb-2">
                        <div className="text-sm font-bold text-slate-800">{user.name || "User"}</div>
                        <div className="text-xs text-slate-500">{user.email || "user@example.com"}</div>
                      </div>
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                      </button>
                      <div className="h-px bg-slate-100 my-2"></div>
                      <button 
                        onClick={() => { setProfileOpen(false); setLogoutModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : showGetStarted ? (
              <button
                onClick={onSignUp}
                className="ml-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-blue-600/20 transition-all duration-150 active:scale-95"
              >
                Sign up
              </button>
            ) : null}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-4 pb-4 pt-2 space-y-1 shadow-md">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
          {isAuthenticated && user ? (
            <div className="border-t border-slate-100 pt-2 mt-2 space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-50 rounded-lg">
                <Image src="/userCard.png" alt="Profile" width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-white" />
                <div>
                  <div className="font-bold text-slate-800 text-sm">{user.name || "User"}</div>
                  <div className="text-xs text-slate-500">{user.email || "user@example.com"}</div>
                </div>
              </div>
              <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
                <span className="flex items-center gap-3"><Bell className="w-4 h-4 text-slate-400" /> Notifications</span>
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">2</span>
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
                <span className="flex items-center gap-3"><MessageSquare className="w-4 h-4 text-slate-400" /> Messages</span>
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">12</span>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left">
                <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
              </button>
              <button onClick={() => { setMobileOpen(false); setLogoutModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : showGetStarted ? (
            <button
              onClick={() => { setMobileOpen(false); onSignUp?.(); }}
              className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all"
            >
              Sign up
            </button>
          ) : null}
        </div>
      )}
    </header>

    {/* Logout Confirmation Modal */}
    {logoutModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Logout</h3>
          <p className="text-sm text-slate-500 mb-6">Are you sure you want to log out of your account?</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setLogoutModalOpen(false)}
              disabled={isLoggingOut}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-700 transition-colors disabled:opacity-50"
            >
              No, cancel
            </button>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : "Yes, logout"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
