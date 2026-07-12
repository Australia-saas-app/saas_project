"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/infra/lib/utils"

interface NavLinkProps {
  href: string
  exact?: boolean
  className?: string
  activeClassName?: string
  children: React.ReactNode
}

const NavLink: React.FC<NavLinkProps> = ({
  href,
  exact = false,
  className = "",
  activeClassName = "text-blue-600 font-semibold",
  children,
}) => {
  const pathname = usePathname() || ""

  // Determine active state. If exact, require full match. Otherwise allow prefix matches
  const isActive = React.useMemo(() => {
    if (!pathname) return false
    if (exact) return pathname === href
    if (href === "/") return pathname === "/"
    // treat '/foo' active when pathname === '/foo' or startsWith '/foo/'
    return pathname === href || pathname.startsWith(href + "/")
  }, [pathname, href, exact])

  return (
    <Link href={href} className={cn(className, isActive ? activeClassName : "") }>
      {children}
    </Link>
  )
}

export default NavLink
