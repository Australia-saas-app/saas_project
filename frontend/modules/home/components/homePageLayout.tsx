import React, { Suspense } from "react";
import Services from "./services";
import WhyChooseUs from "./WhyChooseUs";
import Hero from "./hero";
import ServiceHighlights from "./ServiceHighlights";
import BlogSection from "./BlogSection";
import WorldwidePresence from "./WorldwidePresence";
import AffiliateEarnings from "./AffiliateEarnings";
import AudienceRoles from "./AudienceRoles";
import HowItWorks from "./HowItWorks";
import JourneyCTA from "./JourneyCTA";
import MobileAppBanner from "./MobileAppBanner";
import ImpactStatsBar from "./ImpactStatsBar";
import GlobalCommitment from "./GlobalCommitment";
import FeaturedBusinesses from "./FeaturedBusinesses";
import { RecentlyViewedSection } from "./RecentlyViewedSection";
import SessionExpiredLandingModal from "@/src/shared/components/SessionExpiredLandingModal";

const HomePageLayout = () => {
  return (
    <main className="min-h-screen w-full overflow-x-clip">
      <Suspense fallback={null}>
        <SessionExpiredLandingModal />
      </Suspense>
      <Hero />
      <RecentlyViewedSection />
      <Services />
      <WhyChooseUs />
      <AudienceRoles />
      <HowItWorks />
      <AffiliateEarnings />
      <FeaturedBusinesses />
      <ServiceHighlights />
      <ImpactStatsBar />
      <MobileAppBanner />
      <BlogSection />
      <WorldwidePresence />
      <GlobalCommitment />
      <JourneyCTA />
    </main>
  );
};

export default HomePageLayout;
