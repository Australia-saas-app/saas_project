"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Navbar } from "@/core/landing/ui/Navbar";
import { LandingPage } from "@/core/landing/ui/LandingPage";
import { Footer } from "@/core/landing/ui/Footer";
import { useAuth } from "@/core/auth/context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Pre-fetch the login page as soon as the home page loads
  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  const handleGetStarted = useCallback(() => {
    if (isAuthenticated) {
      toast.info("You are already logged in!");
      return;
    }
    router.push("/login");
  }, [router, isAuthenticated]);

  const handleSignUp = useCallback((role?: string | any) => {
    if (isAuthenticated) {
      toast.info("An account is already logged in!");
      return;
    }
    const roleString = typeof role === "string" ? role : undefined;
    const roleParam = roleString ? `&role=${roleString}` : "";
    router.push(`/login?mode=register${roleParam}`);
  }, [router, isAuthenticated]);

  return (
    <div className="min-h-screen bg-[#e9f1fc] font-[family-name:var(--font-geist-sans)] pt-16">
      <Navbar onSignUp={handleSignUp} />
      <LandingPage onGetStarted={handleGetStarted} onSignUp={handleSignUp} />
      <Footer />
    </div>
  );
}
