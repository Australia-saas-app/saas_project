"use client";

import { useRef, useState, useEffect } from "react";
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
  Code2,
  Building2,
  Plane,
  GraduationCap,
  UserCircle,
  HeartPulse,
  Truck,
  Wallet,
  Handshake,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";

const features = [
  { icon: <Rocket className="w-5 h-5 text-blue-600" />, label: "Smart", sub: "Solutions" },
  { icon: <ShieldCheck className="w-5 h-5 text-blue-600" />, label: "Secure &", sub: "Reliable" },
  { icon: <BarChart2 className="w-5 h-5 text-blue-600" />, label: "Scalable", sub: "Growth" },
  { icon: <Globe className="w-5 h-5 text-blue-600" />, label: "Global", sub: "Impact" },
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
  const brandsScrollRef = useRef<HTMLDivElement>(null);
  
  // Custom Select Category State
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const scrollBrands = (direction: 'left' | 'right') => {
    if (brandsScrollRef.current) {
      const scrollAmount = 300;
      brandsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section
      id="home"
      className="w-full overflow-hidden bg-[#e9f1fc]"
    >
      {/* ── Mobile: stack image then text tightly. Desktop: side by side full-height ── */}
      <div className="flex flex-col md:flex-row md:items-stretch min-h-0 md:min-h-[calc(100vh-64px)] w-full">

        {/* ─── Hero Image (top on mobile, right on desktop) ─── */}
        <div className="w-full md:w-[60%] order-1 md:order-2 flex items-start md:justify-end md:-ml-6 overflow-hidden">
          <Image
            src="/heroImage.png"
            alt="Business professionals using technology"
            width={880}
            height={640}
            className="w-full h-auto object-cover object-center md:object-contain md:object-right max-h-[55vw] md:max-h-none min-h-[240px] md:min-h-0"
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
              <div key={f.label} className="flex items-center gap-2">
                <div className="shrink-0 p-2 bg-white/70 rounded-lg shadow-sm">
                  {f.icon}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-700 leading-tight">
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
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 lg:mb-2 text-center">
          Choose Your Account Type
        </h2>
        <p className="text-slate-500 text-sm sm:text-base text-center">
          Join as per your goals and unlock the right opportunities
        </p>
      </div>

      {/* ─── Account Cards Section ─── */}
      <div className="bg-[#e9f1fc] pb-8 lg:pb-10 pt-4 lg:pt-6 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 w-full max-w-7xl mx-auto">
          {accountTypes.map((card) => (
            <div
              key={card.type}
              className="relative overflow-hidden rounded-[2rem] shadow-md flex flex-col h-[310px] hover:-translate-y-2 hover:shadow-xl transition-all duration-300"
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
                  className="object-cover object-right lg:object-left"
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
              <p className="text-xs text-slate-500 mt-0.5">User, Affiliate<br />or Business</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 ring-4 ring-purple-50 shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Explore / Promote</h4>
              <p className="text-xs text-slate-500 mt-0.5">Find or promote<br />services</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 ring-4 ring-orange-50 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Buy / Sell / Work</h4>
              <p className="text-xs text-slate-500 mt-0.5">Make orders or<br />complete projects</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-600/30 ring-4 ring-green-50 shrink-0">
              <Briefcase className="w-6 h-6 fill-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Earn & Get Paid</h4>
              <p className="text-xs text-slate-500 mt-0.5">Receive payments<br />securely</p>
            </div>
          </div>

          <ArrowRight className="w-5 h-5 text-slate-300 rotate-90 lg:rotate-0 shrink-0" />

          <div className="flex flex-col items-center text-center lg:flex-row lg:text-left gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 ring-4 ring-blue-50 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Grow & Succeed</h4>
              <p className="text-xs text-slate-500 mt-0.5">Scale your business<br />worldwide</p>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Why Choose MultiService? ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-8 lg:pb-10 px-0">
        <div className="w-full bg-white rounded-none py-6 lg:py-10 px-6 lg:px-10 shadow-none border-y border-slate-100">

          <div className="flex flex-col items-center text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Why Choose MultiService?</h2>
            <p className="text-slate-500 text-sm sm:text-base text-center">
              We provide the best experience for users, affiliates and businesses.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Secure & Trusted</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Your security & trust<br />is our priority</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-orange-200 hover:shadow-[0_4px_16px_-4px_rgba(249,115,22,0.12)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Escrow Payments</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Safe payments release<br />on project completion</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-green-200 hover:shadow-[0_4px_16px_-4px_rgba(34,197,94,0.12)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Verified Members</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">All members are<br />verified manually</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">24/7 Support</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">We're here to help<br />anytime, anywhere</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-purple-200 hover:shadow-[0_4px_16px_-4px_rgba(168,85,247,0.12)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Global Reach</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Serving customers in<br />120+ countries</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-green-200 hover:shadow-[0_4px_16px_-4px_rgba(34,197,94,0.12)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Best Prices</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Competitive pricing<br />for everyone</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Find the perfect service ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-8 lg:pb-10 px-4 sm:px-6 lg:px-8 flex justify-center border-t border-slate-100">
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

            <div className="w-full md:w-64 relative" ref={categoryRef}>
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full pl-12 pr-10 h-14 rounded-xl border border-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm text-slate-600 bg-white cursor-pointer flex items-center justify-between transition-colors text-left"
              >
                <span className="truncate">
                  {selectedCategory === "tech" ? "Technology" : 
                   selectedCategory === "marketing" ? "Marketing" : 
                   selectedCategory === "design" ? "Design" : "Select Category"}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {isCategoryOpen && (
                <div className="absolute top-full mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-lg z-50 overflow-hidden py-1">
                  {[
                    { val: "", label: "Select Category" },
                    { val: "tech", label: "Technology" },
                    { val: "marketing", label: "Marketing" },
                    { val: "design", label: "Design" }
                  ].map((cat) => (
                    <button
                      key={cat.val}
                      type="button"
                      onClick={() => { setSelectedCategory(cat.val); setIsCategoryOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === cat.val ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="w-full md:w-auto px-8 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md shadow-blue-600/20 active:scale-95">
              <Search className="w-5 h-5" />
              Search
            </button>

          </div>
        </div>
      </div>
      {/* ─── Everything You Need ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-8 lg:pb-10 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto bg-white rounded-[2rem] p-6 lg:p-10 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] border border-slate-100">

          {/* Header row */}
          <div className="flex flex-col md:flex-row items-start justify-between mb-6 gap-4 md:items-center">
            <div>
              <p className="text-blue-600 text-sm lg:text-base font-bold uppercase tracking-widest mb-1">Our Services</p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 leading-tight whitespace-normal md:whitespace-nowrap">
                Everything You Need to Grow Your Business
              </h2>
            </div>
            <button className="shrink-0 px-4 py-2 border border-blue-500 rounded-xl text-sm font-semibold text-blue-600 hover:border-blue-700 hover:text-blue-700 transition-colors flex items-center gap-1.5 whitespace-nowrap">
              View All Services <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">

            {/* Technology */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Code2 className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Technology</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Web & App Development,<br className="hidden md:block" />Software Solutions</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Real Estate */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Real Estate</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Buy, Sell & Rent<br className="hidden md:block" />Properties</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Travel & Visa */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Plane className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Travel & Visa</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Flight, Hotel &<br className="hidden md:block" />Visa Services</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Marketplace */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-red-100 hover:shadow-[0_4px_16px_-4px_rgba(239,68,68,0.12)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Marketplace</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Buy & Sell Products<br className="hidden md:block" />Worldwide</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Courses */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Courses</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Online Learning &<br className="hidden md:block" />Certification</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Job Service */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <UserCircle className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Job Service</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Find Jobs & Hire<br className="hidden md:block" />Top Talent</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Healthcare */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-red-100 hover:shadow-[0_4px_16px_-4px_rgba(239,68,68,0.12)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <HeartPulse className="w-5 h-5 text-red-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Healthcare</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Book Doctor &<br className="hidden md:block" />Health Services</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Logistics */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-orange-100 hover:shadow-[0_4px_16px_-4px_rgba(249,115,22,0.12)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 text-orange-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Logistics</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Fast & Reliable<br className="hidden md:block" />Delivery</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Finance */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-green-100 hover:shadow-[0_4px_16px_-4px_rgba(34,197,94,0.12)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 text-green-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">Finance</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Payment, Wallet &<br className="hidden md:block" />Investments</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* More Services */}
            <div className="group border border-slate-100 rounded-2xl p-3 md:p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-slate-200 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] transition-all duration-200 cursor-pointer relative pb-10 md:pb-8">
              <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-10 md:h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  <MoreHorizontal className="w-5 h-5 text-slate-500" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs md:text-sm leading-tight mb-1">More Services</h4>
                  <p className="text-[10px] md:text-[11px] text-slate-500 leading-snug">Explore All<br className="hidden md:block" />Services</p>
                </div>
              </div>
              <ArrowRight className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 text-blue-500 shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>

          </div>
        </div>
      </div>

      {/* ─── Why Businesses Choose Vero ─── */}
      <div className="bg-[#e9f1fc] pt-4 pb-8 lg:pb-10 px-0">
        <div className="w-full bg-white rounded-none py-6 lg:py-10 px-6 lg:px-10 shadow-none border-y border-slate-100">

          <p className="text-blue-600 text-sm lg:text-base font-bold uppercase tracking-widest text-center mb-6">Why Businesses Choose Vero</p>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Global Experience</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Years of experience delivering solutions worldwide.</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Local Expertise</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Local teams with in-depth knowledge of regional markets.</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Data Security</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Enterprise-grade security and compliance standards.</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">24/7 Support</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Round-the-clock support whenever you need us.</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1.5} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Fast Delivery</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">Agile processes for faster, smarter deliveries.</p>
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl p-3 lg:p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:border-blue-200 hover:shadow-[0_4px_16px_-4px_rgba(59,130,246,0.15)] transition-all duration-200 flex flex-col items-center justify-center text-center lg:flex-row lg:items-center lg:text-left gap-2 lg:gap-3 aspect-square lg:aspect-auto">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 lg:w-7 lg:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-[10px] lg:text-sm mb-0.5 lg:mb-1 leading-tight">Long-term Partner</h4>
                <p className="text-[9px] lg:text-xs text-slate-500 leading-snug">We build lasting partnerships for sustainable growth.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Our Global Presence ─── */}
      <div className="bg-[#e9f1fc] pb-8 lg:pb-10 px-0">
        <div className="w-full bg-white rounded-none py-6 lg:py-10 px-4 sm:px-6 lg:px-10 shadow-none border-y border-slate-100">
          <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
          
          {/* Left Content - Text & Stats */}
          <div className="flex-1 w-full text-center lg:text-left lg:pl-12 xl:pl-16">
            <h4 className="text-blue-600 text-xs sm:text-sm lg:text-base font-bold uppercase tracking-[0.2em] mb-4">Our Global Presence</h4>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1221] leading-[1.15] mb-6">
              We Are Everywhere<br className="hidden sm:block" />Our Clients Are
            </h2>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed mb-10 max-w-lg mx-auto lg:mx-0">
              VERO delivers innovative digital solutions to businesses around the world. Our global presence enables us to understand local markets and deliver exceptional results.
            </p>
            
            {/* Stat Cards */}
            <div className="flex flex-wrap lg:flex-nowrap justify-center lg:justify-start items-center gap-y-8 divide-x divide-slate-100">
              
              <div className="flex flex-col items-center lg:items-start px-6 sm:px-8 lg:pl-0 lg:pr-8 border-l-0">
                <div className="w-10 h-10 rounded-full bg-blue-50/50 flex items-center justify-center mb-3 text-blue-600">
                  <Globe className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">150+</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Countries</p>
              </div>

              <div className="flex flex-col items-center lg:items-start px-6 sm:px-8">
                <div className="w-10 h-10 rounded-full bg-blue-50/50 flex items-center justify-center mb-3 text-blue-600">
                  <Building2 className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">50+</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Global Offices</p>
              </div>

              <div className="flex flex-col items-center lg:items-start px-6 sm:px-8">
                <div className="w-10 h-10 rounded-full bg-blue-50/50 flex items-center justify-center mb-3 text-blue-600">
                  <Users className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">10K+</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Active Clients</p>
              </div>

              <div className="flex flex-col items-center lg:items-start px-6 sm:px-8">
                <div className="w-10 h-10 rounded-full bg-blue-50/50 flex items-center justify-center mb-3 text-blue-600">
                  <Handshake className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">200+</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Partners</p>
              </div>

            </div>
          </div>

          {/* Right Content - Map */}
          <div className="flex-1 w-full flex items-center justify-center">
            <img 
              src="/map.png" 
              alt="Global Presence Map" 
              className="w-full max-w-lg lg:max-w-none h-auto object-contain"
            />
          </div>
          
        </div>
      </div>
      </div>

      {/* ─── Trusted By Global Brands ─── */}
      <div className="bg-[#e9f1fc] pb-8 lg:pb-10 px-0">
        <div className="w-full bg-white rounded-none py-6 lg:py-8 shadow-none border-y border-slate-100 overflow-hidden relative">
          <div className="w-full max-w-7xl mx-auto">
            <p className="text-blue-600 text-xs sm:text-sm lg:text-base font-bold uppercase tracking-[0.2em] text-center mb-6 px-4">TRUSTED BY GLOBAL BRANDS</p>
            
            <div className="relative group">
              {/* Left Arrow (Always Visible) */}
              <button 
                onClick={() => scrollBrands('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md text-slate-400 hover:text-blue-600 hover:bg-white transition-all lg:hidden"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div 
                ref={brandsScrollRef}
                className="w-full overflow-x-auto scrollbar-hide hide-scrollbar scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="flex justify-center items-center min-w-[600px] sm:min-w-0 px-8 sm:px-8">
                  <img 
                    src="/brands.png" 
                    alt="Trusted Global Brands" 
                    className="w-full max-w-5xl h-auto object-contain"
                  />
                </div>
              </div>

              {/* Right Arrow (Always Visible) */}
              <button 
                onClick={() => scrollBrands('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-md text-slate-400 hover:text-blue-600 hover:bg-white transition-all lg:hidden"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ─── Ready to Start Your Journey? ─── */}
      <div className="bg-[#1a1060] relative overflow-hidden py-5 px-4 sm:px-8 lg:px-12" style={{background: 'linear-gradient(135deg, #1a1060 0%, #0f0a3c 40%, #0d1b4b 100%)'}}>
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-40%] left-[-10%] w-[50%] h-[200%] bg-blue-700/30 rounded-full blur-[80px]"></div>
          <div className="absolute top-[-40%] left-[10%] w-[30%] h-[200%] bg-purple-700/20 rounded-full blur-[60px]"></div>
        </div>

        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* Left: Rocket + Text */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Rocket icon styled as illustration */}
            <div className="w-16 h-16 shrink-0 relative">
              <div className="w-full h-full bg-gradient-to-b from-blue-400/20 to-transparent rounded-full flex items-center justify-center">
                <Rocket className="w-10 h-10 text-white drop-shadow-[0_0_12px_rgba(99,179,237,0.8)]" strokeWidth={1.2} style={{transform: 'rotate(-45deg)'}} />
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight mb-0.5">Ready to Start Your Journey?</h2>
              <p className="text-slate-300 text-xs max-w-xs">Join thousands of users, affiliates and businesses growing together on Veror platform.</p>
            </div>
          </div>
          
          {/* Right: Buttons */}
          <div className="flex flex-row gap-1.5 sm:gap-3 w-full sm:w-auto">
            {/* Join as User - Blue */}
            <button onClick={() => onSignUp?.('user')} className="flex flex-1 items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg sm:rounded-xl px-1 sm:px-4 py-2.5 sm:py-3 transition-colors sm:min-w-[160px]">
              <div className="w-5 h-5 sm:w-8 sm:h-8 rounded bg-blue-500/50 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <div className="font-bold text-[9px] xs:text-[10px] sm:text-sm leading-tight whitespace-nowrap">Join as User</div>
                <div className="hidden sm:block text-[10px] text-blue-200 leading-tight mt-0.5">Get started for free</div>
              </div>
            </button>
            
            {/* Join as Affiliate - Purple */}
            <button onClick={() => onSignUp?.('affiliate')} className="flex flex-1 items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-lg sm:rounded-xl px-1 sm:px-4 py-2.5 sm:py-3 transition-colors sm:min-w-[160px]">
              <div className="w-5 h-5 sm:w-8 sm:h-8 rounded bg-indigo-400/30 flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <div className="font-bold text-[9px] xs:text-[10px] sm:text-sm leading-tight whitespace-nowrap">Join as Affiliate</div>
                <div className="hidden sm:block text-[10px] text-indigo-200 leading-tight mt-0.5">Start earning today</div>
              </div>
            </button>
            
            {/* Join as Business - Green */}
            <button onClick={() => onSignUp?.('business')} className="flex flex-1 items-center justify-center sm:justify-start gap-1 sm:gap-3 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-lg sm:rounded-xl px-1 sm:px-4 py-2.5 sm:py-3 transition-colors sm:min-w-[160px]">
              <div className="w-5 h-5 sm:w-8 sm:h-8 rounded bg-green-400/30 flex items-center justify-center shrink-0">
                <Briefcase className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <div className="font-bold text-[9px] xs:text-[10px] sm:text-sm leading-tight whitespace-nowrap">Join as Business</div>
                <div className="hidden sm:block text-[10px] text-green-200 leading-tight mt-0.5">Grow your business</div>
              </div>
            </button>
          </div>
          
        </div>
      </div>

    </section>
  );
}
