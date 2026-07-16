"use client";

import Image from "next/image";
import {
  Rocket,
  ShieldCheck,
  BarChart2,
  Globe,
  ArrowRight,
  User,
  Users,
  Briefcase,
  CheckCircle2,
  Search,
  ShoppingBag,
  Trophy,
  Shield,
  Lock,
  Headphones,
  DollarSign,
  Clock,
  MapPin,
  UserPlus,
} from "lucide-react";

const features = [
  { icon: <Rocket className="w-4 h-4 text-blue-600" />, label: "Smart", sub: "Solutions" },
  { icon: <ShieldCheck className="w-4 h-4 text-blue-600" />, label: "Secure &", sub: "Reliable" },
  { icon: <BarChart2 className="w-4 h-4 text-blue-600" />, label: "Scalable", sub: "Growth" },
  { icon: <Globe className="w-4 h-4 text-blue-600" />, label: "Global", sub: "Impact" },
];

const accountTypes = [
  {
    type: "user",
    title: "For Users",
    titleColor: "text-blue-700",
    iconBg: "bg-blue-600",
    buttonBg: "bg-blue-600 hover:bg-blue-700",
    icon: <User className="w-6 h-6 text-white" />,
    subtitle: (<>Find, Buy & Get the Best Services<br />You Need</>),
    features: [
      "Access Thousands of Services",
      "Secure Payments & Escrow",
      "Track Orders & Projects",
      "24/7 Customer Support",
    ],
    buttonText: "Create User Account",
    image: "/userCard.png",
    cardBg: "bg-blue-50/40 border-blue-100",
    role: "user",
  },
  {
    type: "affiliate",
    title: "For Affiliates",
    titleColor: "text-purple-700",
    iconBg: "bg-purple-600",
    buttonBg: "bg-purple-600 hover:bg-purple-700",
    icon: <Users className="w-6 h-6 text-white" />,
    subtitle: (<>Promote, Earn & Build Your<br />Passive Income</>),
    features: [
      "Promote Services & Products",
      "Earn Commission (10% - 25%)",
      "Real-time Tracking & Reports",
      "Withdraw Anytime",
    ],
    buttonText: "Join as Affiliate",
    image: "/affiliateCard.png",
    cardBg: "bg-purple-50/40 border-purple-100",
    role: "affiliate",
  },
  {
    type: "business",
    title: "For Businesses",
    titleColor: "text-green-700",
    iconBg: "bg-green-600",
    buttonBg: "bg-green-600 hover:bg-green-700",
    icon: <Briefcase className="w-6 h-6 text-white" />,
    subtitle: (<>Sell, Manage & Grow Your<br />Business Globally</>),
    features: [
      "List Your Services/Products",
      "Manage Orders & Projects",
      "Secure Escrow System",
      "Analytics & Reports",
    ],
    buttonText: "Create Business Account",
    image: "/businessCard.png",
    cardBg: "bg-green-50/40 border-green-100",
    role: "business",
  },
];

interface LandingPageProps {
  onGetStarted: () => void;
  onSignUp?: (role?: string) => void;
}

export function LandingPage({ onGetStarted, onSignUp }: LandingPageProps) {
  return (
    <section
      id="home"
      className="w-full overflow-hidden bg-[#e9f1fc]"
    >
      {/* ── Mobile: stack image then text tightly. Desktop: side by side full-height ── */}
      <div className="flex flex-col md:flex-row md:items-stretch min-h-[calc(100vh-64px)] w-full">

        {/* ─── Hero Image (top on mobile, right on desktop) ─── */}
        <div className="w-full md:w-[60%] order-1 md:order-2 flex items-start justify-end md:-ml-6 overflow-hidden">
          <Image
            src="/heroImage.png"
            alt="Business professionals using technology"
            width={880}
            height={640}
            className="w-full h-auto object-contain md:object-right max-h-[55vw] md:max-h-none min-h-[240px] md:min-h-0"
            priority
          />
        </div>

        {/* ─── Left Content (below image on mobile, left on desktop) ─── */}
        <div className="w-full md:w-[52%] order-2 md:order-1 flex flex-col justify-center
                        px-5 sm:px-10 md:pl-10 lg:pl-12 xl:pl-16 md:pr-4
                        pt-4 pb-8 md:py-0">

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-[3rem] xl:text-[3.4rem] font-extrabold text-slate-900 leading-tight tracking-tight mb-3 lg:mb-5">
            Accelerating Business
            <br />
            Growth Through{" "}
            <span className="text-blue-600">Innovation</span>
            <br />
            <span className="text-blue-600">And Technology</span>
          </h1>

          {/* Sub-text */}
          <p className="text-slate-500 text-sm lg:text-base leading-relaxed max-w-md mb-5 lg:mb-8">
            We help businesses build powerful digital experiences through smart
            technology, modern infrastructure, and scalable solutions designed
            for a fast-moving global economy.
          </p>

          {/* Feature Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4 gap-x-3 gap-y-3 mb-6 md:mb-10">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-1.5">
                <div className="shrink-0 p-1.5 bg-white/70 rounded-lg shadow-sm">
                  {f.icon}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-700 leading-tight">
                  {f.label}
                  <br />
                  {f.sub}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-row gap-2 sm:gap-3 w-full max-w-full overflow-hidden">
            <button
              onClick={onGetStarted}
              className="group flex-1 sm:flex-none sm:w-[175px] flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-0 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl border-2 border-transparent shadow-md shadow-blue-600/30 transition-all duration-200 active:scale-95 whitespace-nowrap"
            >
              Get Started
              <span className="flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 bg-white rounded-full transition-colors shrink-0">
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              </span>
            </button>

            <button className="group flex-1 sm:flex-none sm:w-[175px] flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-0 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border-2 border-blue-600 shadow-sm transition-all duration-200 active:scale-95 whitespace-nowrap">
              Explore Services
              <span className="flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 border border-blue-600 rounded-full group-hover:border-blue-400 transition-colors shrink-0">
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              </span>
            </button>
          </div>
        </div>

      </div>

      {/* ─── "Choose Your Account Type" Header ─── */}
      <div className="border-t border-slate-100 bg-white pt-8 lg:pt-10 pb-4 lg:pb-5 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 lg:mb-2">
          Choose Your Account Type
        </h2>
        <p className="text-slate-500 text-sm sm:text-base">
          Join as per your goals and unlock the right opportunities
        </p>
      </div>

      {/* ─── Account Cards Section ─── */}
      <div className="bg-[#e9f1fc] pb-8 lg:pb-10 pt-4 lg:pt-6 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 w-full max-w-7xl mx-auto">
          {accountTypes.map((card) => (
            <div
              key={card.type}
              className="relative overflow-hidden rounded-[2rem] shadow-md flex flex-col h-[310px]"
            >
              {/* Left Content (Z-10 so it sits above the background image) */}
              <div className="relative z-10 w-[58%] flex flex-col justify-between p-5 h-full">

                {/* Header: Icon + Title in one row */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center shadow-sm ${card.iconBg}`}>
                      {card.icon}
                    </div>
                    <h3 className={`text-lg font-bold leading-none whitespace-nowrap ${card.titleColor}`}>{card.title}</h3>
                  </div>
                  <p className="text-xs text-slate-800 font-bold leading-snug mb-3">
                    {card.subtitle}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4">
                  {card.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] text-slate-700 font-bold leading-tight">
                      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${card.titleColor}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <button
                  onClick={() => onSignUp?.(card.role)}
                  className={`w-max px-4 py-2.5 rounded-lg text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95 ${card.buttonBg}`}
                >
                  {card.buttonText} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right Image — full height fill */}
              <div className="absolute inset-0 pointer-events-none">
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover object-left"
                  priority
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── How Veror Works ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-8 lg:pb-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-[1px] w-12 bg-blue-200 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-blue-600"></div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How Veror Works</h2>
          <div className="h-[1px] w-12 bg-blue-200 relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-blue-600"></div>
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto bg-white rounded-[2rem] p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
          
          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-blue-50 shrink-0">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Create Account</h4>
              <p className="text-xs text-slate-500 mt-0.5">User, Affiliate<br/>or Business</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 ring-4 ring-purple-50 shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Explore / Promote</h4>
              <p className="text-xs text-slate-500 mt-0.5">Find or promote<br/>services</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 ring-4 ring-orange-50 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Buy / Sell / Work</h4>
              <p className="text-xs text-slate-500 mt-0.5">Make orders or<br/>complete projects</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-600/30 ring-4 ring-green-50 shrink-0">
              <Briefcase className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Earn & Get Paid</h4>
              <p className="text-xs text-slate-500 mt-0.5">Receive payments<br/>securely</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-blue-50 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Grow & Succeed</h4>
              <p className="text-xs text-slate-500 mt-0.5">Scale your business<br/>worldwide</p>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Why Choose MultiService? ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-8 lg:pb-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Why Choose MultiService?</h2>
        <p className="text-slate-500 text-sm sm:text-base mb-4 text-center">
          We provide the best experience for users, affiliates and businesses.
        </p>

        <div className="w-full max-w-[1350px] 2xl:max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4 px-2">
          
          <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-1 leading-tight">Secure & Trusted</h4>
              <p className="text-[10px] lg:text-xs text-slate-500 leading-snug">Your security & trust<br/>is our priority</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-1 leading-tight">Escrow Payments</h4>
              <p className="text-[10px] lg:text-xs text-slate-500 leading-snug">Safe payments release<br/>on project completion</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-1 leading-tight">Verified Members</h4>
              <p className="text-[10px] lg:text-xs text-slate-500 leading-snug">All members are<br/>verified manually</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Headphones className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-1 leading-tight">24/7 Support</h4>
              <p className="text-[10px] lg:text-xs text-slate-500 leading-snug">We're here to help<br/>anytime, anywhere</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-1 leading-tight">Global Reach</h4>
              <p className="text-[10px] lg:text-xs text-slate-500 leading-snug">Serving customers in<br/>120+ countries</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] flex items-center gap-3 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={1.5} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs lg:text-sm mb-1 leading-tight">Best Prices</h4>
              <p className="text-[10px] lg:text-xs text-slate-500 leading-snug">Competitive pricing<br/>for everyone</p>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Find the perfect service ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-24 px-4 sm:px-6 lg:px-8 flex justify-center border-t border-slate-100">
        <div className="w-full max-w-5xl mx-auto bg-white rounded-[2rem] p-8 lg:p-12 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-8 text-center">Find the perfect service for your needs</h2>
          
          <div className="w-full flex flex-col md:flex-row gap-4 items-center">
            
            <div className="flex-1 w-full relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="What service are you looking for?" 
                className="w-full pl-12 pr-4 h-14 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-slate-400" 
              />
            </div>

            <div className="w-full md:w-64 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select className="w-full pl-12 pr-10 h-14 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-600 appearance-none bg-white cursor-pointer">
                <option value="">Select Category</option>
                <option value="tech">Technology</option>
                <option value="marketing">Marketing</option>
                <option value="design">Design</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.5 1.75L6 6.25L10.5 1.75" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <button className="w-full md:w-auto px-8 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md shadow-blue-600/20 active:scale-95">
              <Search className="w-5 h-5" />
              Search
            </button>

          </div>
        </div>
      </div>

    </section>
  );
}
