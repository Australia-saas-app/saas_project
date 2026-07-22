"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LayoutGrid, Menu, MessageSquare, Search, User, Wallet, X, ChevronDown, LogOut, Loader2, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import NavLink from "@/src/components/ui/NavLink";
import { Spinner } from "@/src/components/ui/Spinner";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useUser } from "@/src/context/user.provider";
import { usePermission } from "@/src/hooks/permission.hook";
import { adminAppPath } from "@/src/constants/app-urls";
import { ThemeToggle } from "@/src/shared/components/ThemeToggle";
import { isProfileComplete, completeProfilePath } from "@/src/shared/lib/profile-completion";
import { accountTypeFromRole } from "@/src/shared/lib/verification-access";
import { getUserIdFromAuthUser, getInitials } from "@/src/shared/lib/demo-user";
import { getProfileOverrides } from "@/src/shared/utils/profile-storage";
import UniversalSearch from "@/src/modules/shared/components/search/UniversalSearch";
import ServicesMegaMenu from "@/src/modules/shared/components/search/ServicesMegaMenu";
import { PRIMARY_NAV } from "@/src/shared/constants/mega-menu";
import { logout } from "@/src/shared/server/AuthService";

const iconButtonClass =
  "relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary";

export default function Header() {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();
  const { user, isLoading, setUser } = useUser();
  const { isAdmin, isAffiliate, isBusiness } = usePermission();

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
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error(error);
    }
    setIsLoggingOut(false);
    setLogoutModalOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.push("/");
    }
  };

  const isSignupPage = pathname?.includes("/registration");

  const accountHref = useMemo(() => {
    if (isAdmin) return adminAppPath("/admin/dashboard");
    if (isBusiness) return "/business/dashboard";
    if (isAffiliate) return "/affiliate/dashboard";
    return "/user/dashboard";
  }, [isAdmin, isAffiliate, isBusiness]);

  const messagesHref = useMemo(() => {
    if (isBusiness) return "/business/messages";
    if (isAffiliate) return "/affiliate/messages";
    return "/user/messages";
  }, [isAffiliate, isBusiness]);

  const walletHref = useMemo(() => {
    if (isBusiness) return "/business/wallet";
    if (isAffiliate) return "/affiliate/wallet";
    return "/user/wallet";
  }, [isAffiliate, isBusiness]);

  const noticesHref = useMemo(() => {
    if (!user) return "/notice";
    if (isBusiness) return "/business/notices";
    if (isAffiliate) return "/affiliate/notices";
    return "/user/notices";
  }, [user, isAffiliate, isBusiness]);

  const userId = getUserIdFromAuthUser(user);
  const avatarUrl = useMemo(() => {
    if (!userId) return null;
    const overrides = getProfileOverrides(userId);
    if (overrides.avatarUrl) return overrides.avatarUrl;
    if (user && "profilePhoto" in user && user.profilePhoto) return String(user.profilePhoto);
    return null;
  }, [user, userId]);

  const userInitial = useMemo(() => {
    if (!user) return null;
    const source = ("fullName" in user && user.fullName) || ("name" in user && user.name) || ("email" in user && user.email) || "";
    return getInitials(String(source));
  }, [user]);

  const goToAccount = () => {
    if (isAdmin) {
      window.location.assign(accountHref);
      return;
    }
    
    if (user && user.id?.startsWith("registered-") && !isProfileComplete(user.id)) {
      const role = 'role' in user ? user.role : ('roles' in user ? user.roles[0] : undefined);
      const accountType = accountTypeFromRole(role as string);
      router.push(completeProfilePath(accountType));
      return;
    }

    router.push(accountHref);
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:shadow-[0_1px_2px_rgb(0_0_0/0.25)]">
      <div className="relative">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="flex h-14 items-center gap-2 sm:h-16 sm:gap-3 md:h-[4.25rem] md:gap-4">
            <NavLink href="/" exact className="flex shrink-0 items-center gap-2">
              <Image
                src="/newLogo.png"
                alt="System DB"
                width={56}
                height={36}
                className="h-7 w-auto sm:h-9"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </NavLink>

            <div className="hidden min-w-0 max-w-[160px] flex-1 md:block lg:max-w-[200px] xl:max-w-[260px]">
              <UniversalSearch variant="header" />
            </div>
            <Link
              href="/search"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary sm:h-10 sm:w-10 md:hidden"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Link>

            <nav
              aria-label="Primary"
              className="ml-auto hidden items-center gap-0 lg:flex xl:gap-0.5"
            >
              {PRIMARY_NAV.map((item) => {
                const active = isActive(item.href);
                const compactHide =
                  item.label === "Our Team" || item.label === "Branch" || item.label === "Blog"
                    ? "hidden xl:inline-flex"
                    : "inline-flex";
                if (item.mega) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        setMegaOpen((v) => !v);
                      }}
                      className={`${compactHide} items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors xl:px-2.5 xl:text-sm ${megaOpen || active
                          ? "font-semibold text-primary"
                          : "text-foreground hover:text-primary"
                        }`}
                      aria-expanded={megaOpen}
                      aria-haspopup="true"
                    >
                      {item.label}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMegaOpen(false)}
                    className={`${compactHide} items-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors xl:px-2.5 xl:text-sm ${active ? "font-semibold text-primary" : "text-foreground hover:text-primary"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1 lg:ml-1">
              <ThemeToggle
                compact
                className="hidden !rounded-full !border-transparent !bg-transparent !text-muted-foreground hover:!bg-primary/10 hover:!text-primary md:inline-flex"
              />

              {user && (
                <>
                  <Link
                    href={messagesHref}
                    className={`hidden md:inline-flex ${iconButtonClass}`}
                    title="Messages"
                    aria-label="Messages"
                  >
                    <MessageSquare className="h-[18px] w-[18px]" />
                  </Link>
                  <Link
                    href={walletHref}
                    className={`hidden md:inline-flex ${iconButtonClass}`}
                    title="Wallet"
                    aria-label="Wallet"
                  >
                    <Wallet className="h-[18px] w-[18px]" />
                  </Link>
                </>
              )}

              <Link
                href={noticesHref}
                className={`hidden sm:inline-flex ${iconButtonClass}`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
              </Link>

              {isLoading ? (
                <Spinner size={18} label={t.common.header.checkingSession} />
              ) : user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 pl-0.5 sm:pl-1 pr-2 sm:pr-3 py-1 bg-[#f0f4ff] hover:bg-blue-50 border border-blue-100 rounded-full transition-colors dark:bg-primary/10 dark:hover:bg-primary/20 dark:border-primary/20"
                  >
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        userInitial ?? <User className="h-4 w-4" />
                      )}
                    </div>
                    {/* Name + role visible on desktop only */}
                    <div className="hidden sm:flex flex-col items-start text-left">
                      <span className="text-xs sm:text-sm font-bold text-foreground leading-tight max-w-[90px] truncate">
                        {('fullName' in user && user.fullName) || ('name' in user && user.name) || ('email' in user && user.email) || "User"}
                      </span>
                      <span className="text-[10px] text-muted-foreground capitalize leading-tight">
                        {user.accountType === "agency" ? "Affiliate" : user.accountType || ('roles' in user && user.roles?.[0]) || "User"}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50">
                      {/* User info header */}
                      <div className="px-4 py-2.5 border-b border-border mb-1">
                        <div className="flex items-center gap-3 mb-1">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shrink-0 overflow-hidden">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              userInitial ?? <User className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-foreground truncate">{('name' in user && user.name) || ('fullName' in user && user.fullName) || ('email' in user && user.email) || "User"}</div>
                            <div className="text-xs text-muted-foreground truncate">{('email' in user && user.email) || "user@example.com"}</div>
                          </div>
                        </div>
                      </div>
                      <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted hover:text-primary transition-colors" onClick={() => { setProfileOpen(false); goToAccount(); }}>
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" /> Dashboard
                      </button>
                      <div className="h-px bg-border my-1"></div>
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); setLogoutModalOpen(true); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : !isSignupPage ? (
                <Link
                  href="/account/user/registration"
                  className="inline-flex h-9 items-center rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 sm:px-5"
                >
                  Sign up
                </Link>
              ) : null}

              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
                onClick={() => {
                  setMegaOpen(false);
                  setMobileOpen((v) => !v);
                }}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {megaOpen && (
          <div className="absolute inset-x-0 top-full z-[60]">
            <ServicesMegaMenu open={megaOpen} onClose={() => setMegaOpen(false)} />
          </div>
        )}
      </div>

      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative z-50 animate-in fade-in slide-in-from-top-2 border-b border-border bg-background py-4 duration-200 lg:hidden">
            <div className="mx-auto max-h-[75vh] max-w-[1400px] overflow-y-auto px-4">
              <div className="mb-4 md:hidden">
                <UniversalSearch variant="header" />
              </div>
              <nav className="mb-4 grid grid-cols-2 gap-1">
                {PRIMARY_NAV.map((item) => {
                  if (item.mega) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          setMegaOpen(true);
                        }}
                        className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground/90 transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        {item.label}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary ${isActive(item.href) ? "bg-primary/10 text-primary" : "text-foreground/90"
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <ThemeToggle compact className="!rounded-full" />
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setMegaOpen(true);
                  }}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-4 text-xs font-semibold transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  All Services
                </button>
                {!user && !isSignupPage && (
                  <Link
                    href="/account/user/registration"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground sm:flex-none"
                  >
                    Sign up
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div style={{ width: '360px', maxWidth: 'calc(100vw - 32px)' }} className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border">
            {/* Icon */}
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <LogOut className="w-6 h-6 text-red-500" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Confirm Logout</h3>
            <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
              Are you sure you want to log out of your session?<br />You will need to log in again to access the dashboard.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="flex-1 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-semibold text-foreground text-sm transition-colors disabled:opacity-50"
              >
                No, Cancel
              </button>
              <button
                type="button"
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
