"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  badge?: string;
  wide?: boolean;
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  badge,
  wide = false,
}: AuthShellProps) {
  return (
    <div className="grid min-h-[100dvh] flex-1 lg:grid-cols-[1fr_1.05fr] overflow-x-hidden">
      {/* Brand panel — homepage navy/blue palette */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#06153A] via-[#1D4ED8] to-[#2563EB] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.35) 1.25px, transparent 1.35px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom right, black 0%, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to bottom right, black 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-white/95 transition-colors hover:text-white"
          >
            <Image
              src="/newLogo.png"
              alt="Veror"
              width={40}
              height={28}
              className="h-8 w-auto brightness-0 invert"
              style={{ width: "auto", height: "auto" }}
            />
            <span className="text-lg font-semibold tracking-tight">Veror</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          {badge && (
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
              <Sparkles className="h-3.5 w-3.5" />
              {badge}
            </span>
          )}
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/85">{subtitle}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#86EFAC]" strokeWidth={2.25} />
              Secure payments &amp; escrow for every order
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#86EFAC]" strokeWidth={2.25} />
              One platform for users, affiliates &amp; businesses
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#86EFAC]" strokeWidth={2.25} />
              Wallet, projects, and growth tools in one place
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} Veror. All rights reserved.
        </p>
      </div>

      {/* Form side — homepage light surfaces */}
      <div className="flex flex-1 flex-col bg-background">
        <div className="border-b border-border bg-card px-4 py-3.5 sm:px-6 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/newLogo.png"
              alt="Veror"
              width={36}
              height={24}
              className="h-7 w-auto"
              style={{ width: "auto", height: "auto" }}
            />
            <span className="font-semibold text-foreground">Veror</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
            <div className="mb-6 lg:hidden">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="relative flex min-h-[520px] flex-col justify-center rounded-2xl border border-border bg-card p-6 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:p-10">
              {children}
            </div>
            {footer && (
              <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
