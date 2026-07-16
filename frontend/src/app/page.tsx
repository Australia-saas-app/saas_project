"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { Navbar } from "@/core/landing/ui/Navbar";
import { LandingPage } from "@/core/landing/ui/LandingPage";
import { Footer } from "@/core/landing/ui/Footer";

export default function HomePage() {
  const router = useRouter();

  // Pre-fetch the login page as soon as the home page loads
  // so navigation is instant when user clicks a button
  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  const handleGetStarted = useCallback(() => {
    router.push("/login");
  }, [router]);

  const handleSignUp = useCallback((role?: string | any) => {
    const roleString = typeof role === "string" ? role : undefined;
    const roleParam = roleString ? `&role=${roleString}` : "";
    router.push(`/login?mode=register${roleParam}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#e9f1fc] font-[family-name:var(--font-geist-sans)] pt-16">
      <Navbar onSignUp={handleSignUp} />
      <LandingPage onGetStarted={handleGetStarted} onSignUp={handleSignUp} />
      <Footer />
    </div>
  );
}
