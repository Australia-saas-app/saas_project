"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MessageSquare, Wallet, User } from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { usePermission } from "@/src/hooks/permission.hook";

const ICONS = {
  home: Home,
  search: Search,
  messages: MessageSquare,
  wallet: Wallet,
  profile: User,
} as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isAffiliate, isBusiness, isAdmin } = usePermission();

  const profileHref = !user
    ? "/account/user/login"
    : isAdmin
      ? "/account/user/login"
      : isBusiness
        ? "/business/dashboard"
        : isAffiliate
          ? "/affiliate/dashboard"
          : "/user/dashboard";

  const messagesHref = !user
    ? "/account/user/login"
    : isBusiness
      ? "/business/messages"
      : isAffiliate
        ? "/affiliate/messages"
        : "/user/messages";

  const walletHref = !user
    ? "/account/user/login"
    : isBusiness
      ? "/business/wallet"
      : isAffiliate
        ? "/affiliate/wallet"
        : "/user/wallet";

  const items = [
    { label: "Home", href: "/", icon: "home" as const },
    { label: "Search", href: "/search", icon: "search" as const },
    { label: "Messages", href: messagesHref, icon: "messages" as const },
    { label: "Wallet", href: walletHref, icon: "wallet" as const },
    { label: "Profile", href: profileHref, icon: "profile" as const },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          let active = false;
          if (item.icon === "home") {
            active = pathname === "/";
          } else if (item.icon === "search") {
            active = pathname.startsWith("/search");
          } else if (item.icon === "messages") {
            active = pathname.includes("/messages");
          } else if (item.icon === "wallet") {
            active = pathname.includes("/wallet");
          } else if (item.icon === "profile") {
            active = pathname.includes("/dashboard") || pathname.includes("/account");
          }
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-blue-600 pointer-events-none" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
