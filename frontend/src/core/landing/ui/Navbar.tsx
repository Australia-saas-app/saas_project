"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, Bell, MessageSquare, ChevronDown, LogOut, Loader2, LayoutDashboard } from "lucide-react";
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
    await new Promise(resolve => setTimeout(resolve, 800));
    logout();
    setIsLoggingOut(false);
    setLogoutModalOpen(false);
  };

  return (
    <>
      <header className="w-full bg-white border-b border-slate-100 shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-2 sm:gap-4">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/logo_1.png"
                alt="Logo"
                width={52}
                height={52}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                priority
              />
            </Link>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ─── Desktop Nav Links ─── */}
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
            </div>

            {/* ─── Auth Area: shown on ALL screen sizes when logged in, desktop-only Sign up ─── */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Notification Bell */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    2
                  </span>
                </button>

                {/* Chat Icon */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    12
                  </span>
                </button>

                {/* Profile Pill with dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 pr-2 sm:pr-3 py-1 bg-[#f0f4ff] hover:bg-blue-50 border border-blue-100 rounded-full transition-colors"
                  >
                    <Image
                      src="/profile.PNG"
                      alt="Profile"
                      width={32}
                      height={32}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 bg-white"
                    />
                    {/* Name + role visible on desktop only */}
                    <div className="hidden sm:flex flex-col items-start text-left">
                      <span className="text-xs sm:text-sm font-bold text-slate-800 leading-tight max-w-[90px] truncate">
                        {user.name || "User"}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize leading-tight">
                        {user.roles?.[0] || "User"}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50">
                      {/* User info header */}
                      <div className="px-4 py-2.5 border-b border-slate-100 mb-1">
                        <div className="flex items-center gap-3 mb-1">
                          <Image
                            src="/profile.PNG"
                            alt="Profile"
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-800 truncate">{user.name || "User"}</div>
                            <div className="text-xs text-slate-500 truncate">{user.email || "user@example.com"}</div>
                          </div>
                        </div>
                      </div>
                      <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                        <LayoutDashboard className="w-4 h-4 text-slate-400" /> Dashboard
                      </button>
                      <div className="h-px bg-slate-100 my-1"></div>
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
              /* Sign up — desktop only; mobile users see it in hamburger */
              <button
                onClick={onSignUp}
                className="hidden lg:block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm shadow-blue-600/20 transition-all duration-150 active:scale-95 whitespace-nowrap"
              >
                Sign up
              </button>
            ) : null}

            {/* Mobile hamburger — always visible on mobile */}
            <button
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Menu — nav links only */}
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
            {!isAuthenticated && showGetStarted && (
              <button
                onClick={() => { setMobileOpen(false); onSignUp?.(); }}
                className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-all"
              >
                Sign up
              </button>
            )}
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div style={{ width: '360px', maxWidth: 'calc(100vw - 32px)' }} className="bg-white rounded-2xl shadow-2xl p-7 text-center mx-auto">
            {/* Icon */}
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <LogOut className="w-6 h-6 text-red-500" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Logout</h3>
            <p className="text-sm text-slate-500 mb-7 leading-relaxed">
              Are you sure you want to log out of your session?<br />You will need to log in again to access the dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 text-sm transition-colors disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl font-semibold text-white text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
