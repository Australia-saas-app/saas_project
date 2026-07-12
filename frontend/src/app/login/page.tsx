import { AuthFlipContainer } from "@/core/auth/ui/AuthFlipContainer";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f7ff] flex flex-col items-center justify-center relative overflow-hidden font-[family-name:var(--font-geist-sans)]">

      {/* Content */}
      <div className="z-10 w-full max-w-4xl px-8 mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">

        {/* Left Side: Copy & Branding */}
        <div className="w-full lg:w-[460px] flex-shrink-0 text-center lg:text-left space-y-5">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white border border-blue-100 shadow-sm text-blue-600 text-sm font-semibold mb-2">
            Unified Global Platform
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-tight">
            One account. <br className="hidden lg:block" />
            <span className="text-blue-600">Endless</span> possibilities.
          </h1>
          <p className="text-base text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Welcome to the ultimate super app. Whether you&apos;re booking a ride, offering a service, or managing a business, it all happens right here.
          </p>

          {/* Stat Cards — no hover, clean and static */}
          <div className="hidden lg:grid grid-cols-3 gap-3 pt-4 w-full max-w-sm">
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

        {/* Right Side: Auth Forms */}
        <div className="w-full lg:w-[400px] flex-shrink-0 flex justify-center">
          <AuthFlipContainer />
        </div>

      </div>
    </main>
  );
}
