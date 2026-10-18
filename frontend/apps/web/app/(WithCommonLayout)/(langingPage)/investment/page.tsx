import { InvestmentHub } from "@/src/modules/investment/components/InvestmentHub";
import { buildMetadata } from "@/src/lib/seo";

export const metadata = buildMetadata({
  title: "Investment & Capital Syndication",
  description:
    "Explore fractional alternative investments, green energy assets, maritime logistics, and venture opportunities with transparent quarterly dividend distribution.",
  path: "/investment",
});

export default function InvestmentPage() {
  return <InvestmentHub />;
}
