"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { AuthFlipContainer } from "@/core/auth/ui/AuthFlipContainer";
import { Navbar } from "@/core/landing/ui/Navbar";
import { useAuth } from "@/core/auth/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // If already logged in, bounce back to home with toast
  useEffect(() => {
    if (isAuthenticated) {
      toast.info("An account is already logged in!");
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  // Don't render the login form if authenticated (avoids flash before redirect)
  if (isAuthenticated) return null;

  return (
    <div
      className="h-screen overflow-hidden flex flex-col font-[family-name:var(--font-geist-sans)] pt-16"
      style={{ backgroundColor: "#f4f7ff" }}
    >
      {/* Shared Navbar */}
      <Navbar onSignUp={() => router.push("/login?mode=register")} showGetStarted={false} />

      {/* Login content */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden px-4 py-4">

        {/* Background blobs removed to prevent blur over form */}

        <div className="z-10 w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">

          {/* Left Side: Copy & Branding — hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex w-full lg:w-[460px] flex-shrink-0 flex-col text-left space-y-5">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white border border-blue-100 shadow-sm text-blue-600 text-sm font-semibold mb-2 self-start">
              Unified Global Platform
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
              One account. <br />
              <span className="text-blue-600">Endless</span> possibilities.
            </h1>
            <p className="text-base text-slate-500 max-w-xl leading-relaxed">
              Welcome to the ultimate super app. Whether you&apos;re booking a ride,
              offering a service, or managing a business, it all happens right here.
            </p>

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-3 pt-4 w-full max-w-sm">
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
                <h4 className="text-2xl font-bold text-blue-600 mb-1">10k+</h4>
                <p className="text-sm text-slate-500 font-medium">Verified Businesses</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
                <h4 className="text-2xl font-bold text-blue-600 mb-1">$2M+</h4>
                <p className="text-sm text-slate-500 font-medium">Escrow Payments</p>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-center">
                <h4 className="text-2xl font-bold text-blue-600 mb-1">4.9/5</h4>
                <p className="text-sm text-slate-500 font-medium">Average Rating</p>
              </div>
            </div>
          </div>

          {/* Auth Form — full width on mobile, fixed width on desktop */}
          <div className="w-full lg:w-[400px] flex-shrink-0 flex justify-center">
            <div className="w-full max-w-sm lg:max-w-none">
              <AuthFlipContainer />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
