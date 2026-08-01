"use client";

import Link from "next/link";
import { ArrowLeft, Home, LayoutDashboard, Search, Compass, AlertCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[85vh] w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[350px] w-[550px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[250px] w-[350px] rounded-full bg-indigo-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        {/* Animated Pill Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur-md">
          <AlertCircle className="h-3.5 w-3.5 text-primary" />
          <span>Error 404 &bull; Page Not Found</span>
        </div>

        {/* Large Glowing 404 Display */}
        <div className="relative my-6">
          <h1 className="select-none text-8xl font-extrabold tracking-tighter text-foreground sm:text-9xl md:text-[10rem] opacity-90">
            4<span className="text-primary bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">0</span>4
          </h1>
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 to-transparent opacity-50 blur-2xl" />
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          Lost in Hyperspace?
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          The page you are looking for doesn&apos;t exist, has been moved, or is temporarily unavailable. Let&apos;s get you back on track!
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col gap-3.5 w-full sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto rounded-xl bg-primary font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 px-6"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-xl border-border bg-card/50 hover:bg-accent hover:text-accent-foreground font-semibold shadow-sm backdrop-blur-md transition-all flex items-center justify-center gap-2 px-6"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <span>Go to Dashboard</span>
            </Link>
          </Button>
        </div>

        {/* Quick Search / Explore Suggestions */}
        <div className="mt-12 w-full rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm backdrop-blur-lg">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-3 px-1">
            <span className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-primary" />
              Popular Destination Shortcuts
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Link
              href="/dashboard/user/dashboard"
              className="group flex items-center justify-between rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent/50 transition-all"
            >
              <span>User Portal</span>
              <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/dashboard/affiliate/dashboard"
              className="group flex items-center justify-between rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent/50 transition-all"
            >
              <span>Affiliate Portal</span>
              <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <Link
              href="/dashboard/business/dashboard"
              className="group flex items-center justify-between rounded-xl border border-border/40 bg-background/50 px-3 py-2.5 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-accent/50 transition-all col-span-2 sm:col-span-1"
            >
              <span>Business Portal</span>
              <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
