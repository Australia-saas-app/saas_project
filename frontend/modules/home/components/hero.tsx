import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Globe2, BadgeCheck, Play, Sparkles } from "lucide-react";
import UniversalSearch from "@/src/modules/shared/components/search/UniversalSearch";

const FEATURES = [
  { label: "Secure", icon: Shield },
  { label: "Smart", icon: Zap },
  { label: "Global", icon: Globe2 },
  { label: "Reliable", icon: BadgeCheck },
] as const;

const TRUST_AVATARS = [
  "https://i.pravatar.cc/80?img=11",
  "https://i.pravatar.cc/80?img=32",
  "https://i.pravatar.cc/80?img=5",
  "https://i.pravatar.cc/80?img=48",
];

export default function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:gap-8 md:px-6 md:py-8 lg:min-h-[480px] lg:grid-cols-2 lg:items-center lg:gap-8">
        {/* Left — stretched across the same height as the image */}
        <div className="reveal flex h-full flex-col justify-between gap-5 lg:py-2">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F1FF] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1E3A8A] dark:bg-blue-950/50 dark:text-blue-200">
              <Sparkles className="h-3 w-3 text-[#7C3AED]" fill="currentColor" />
              Global Multi-Service Platform
            </span>

            <h1 className="text-[1.85rem] font-extrabold leading-[1.12] tracking-tight text-foreground sm:text-[2.25rem] lg:text-[2.5rem] xl:text-[2.7rem]">
              One{" "}
              <span className="bg-[linear-gradient(90deg,#4F46E5_0%,#2563EB_50%,#7C3AED_100%)] bg-clip-text text-transparent">
                Global
              </span>{" "}
              Platform For All Your Needs
            </h1>

            <p className="max-w-md text-sm font-medium leading-snug text-muted-foreground md:text-[15px]">
              Connect as a User, Earn as an Affiliate, Grow as a Business — All in One Platform.
            </p>
          </div>

          {/* Landing Page Global Search Bar */}
          <div className="w-full max-w-lg z-20">
            <UniversalSearch variant="hero" className="shadow-sm hover:shadow-md transition-shadow" />
          </div>

          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {FEATURES.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 text-[#2563EB]" strokeWidth={2.25} aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/account/user/registration"
                className="group inline-flex h-11 items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(29,78,216,0.25)] transition hover:bg-[#1E40AF]"
              >
                Join Now – It&apos;s Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#services"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-border hover:bg-muted"
              >
                Explore Platform
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                  <Play className="h-2.5 w-2.5 fill-current" aria-hidden />
                </span>
              </a>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {TRUST_AVATARS.map((src) => (
                  <Image
                    key={src}
                    src={src}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border-2 border-background object-cover shadow-sm"
                  />
                ))}
              </div>
              <p className="text-[13px] font-medium text-muted-foreground">
                Trusted by <span className="font-semibold text-foreground">20K+</span> users
                worldwide
              </p>
            </div>
          </div>
        </div>

        {/* Right — same height, flush with the text column */}
        <div className="reveal reveal-delay-2 relative h-[260px] w-full overflow-hidden rounded-2xl border border-border shadow-md sm:h-[320px] lg:h-auto lg:min-h-0">
          <Image
            src="/image/banner.png"
            alt="Global technology and engineering teams at work"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-[center_18%]"
          />
        </div>
      </div>
    </section>
  );
}
