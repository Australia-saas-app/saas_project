"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Search,
  Filter,
  Rocket,
  ShieldCheck,
  DollarSign,
  Users,
  Briefcase,
  Layers,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { PublicPageShell } from "@/src/modules/shared/components/public/PublicPageShell";
import { InvestmentCard } from "./InvestmentCard";
import { InvestModal } from "./InvestModal";
import { CreateCampaignModal } from "./CreateCampaignModal";
import { MyPortfolioTab } from "./MyPortfolioTab";
import { Campaign, CampaignCategory, Pledge, PlatformInvestmentStats, RiskLevel } from "../types";
import { MOCK_CAMPAIGNS, MOCK_STATS } from "../mock-campaigns";

const CATEGORIES: { label: string; value: CampaignCategory }[] = [
  { label: "All Sectors", value: "ALL" },
  { label: "Renewable Energy", value: "Renewable Energy" },
  { label: "Maritime & Shipping", value: "Maritime & Shipping" },
  { label: "FinTech & AI", value: "FinTech & AI" },
  { label: "Commercial Real Estate", value: "Commercial Real Estate" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "AgriTech", value: "AgriTech" },
];

export const InvestmentHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"OPPORTUNITIES" | "PORTFOLIO">("OPPORTUNITIES");
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [stats, setStats] = useState<PlatformInvestmentStats>(MOCK_STATS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CampaignCategory>("ALL");
  const [selectedRisk, setSelectedRisk] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"ROI" | "FUNDED" | "MIN_INVEST" | "NEWEST">("ROI");

  // Modals state
  const [selectedCampaignForInvest, setSelectedCampaignForInvest] = useState<Campaign | null>(null);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);

  // User's active pledges
  const [myPledges, setMyPledges] = useState<Pledge[]>([
    {
      id: "pld-demo-1",
      campaignId: "camp-001",
      campaignTitle: "Pacific Hydrogen Cargo Vessels & Logistics",
      investorUserId: "current-user",
      amount: 2500,
      currency: "USD",
      equitySharePercent: 0.006,
      expectedAnnualReturn: 462,
      status: "CONFIRMED",
      paymentMethod: "WALLET",
      transactionId: "TX-INV-849201",
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: "pld-demo-2",
      campaignId: "camp-002",
      campaignTitle: "Solaria Commercial Microgrid & Storage Network",
      investorUserId: "current-user",
      amount: 1000,
      currency: "USD",
      equitySharePercent: 0.006,
      expectedAnnualReturn: 148,
      status: "CONFIRMED",
      paymentMethod: "WALLET",
      transactionId: "TX-INV-849202",
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ]);

  // Load from backend API with fallback
  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, sRes] = await Promise.all([
          fetch("/api/v1/investment/campaigns").catch(() => null),
          fetch("/api/v1/investment/campaigns/stats").catch(() => null),
        ]);

        if (cRes && cRes.ok) {
          const cData = await cRes.json();
          if (Array.isArray(cData) && cData.length > 0) {
            setCampaigns(cData);
          }
        }

        if (sRes && sRes.ok) {
          const sData = await sRes.json();
          if (sData) setStats(sData);
        }
      } catch (err) {
        // Mock fallback remains active
      }
    }
    loadData();
  }, []);

  // Filter & Sort
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        const matchesCategory =
          selectedCategory === "ALL" || c.category === selectedCategory;
        const matchesRisk =
          selectedRisk === "ALL" || c.riskLevel === selectedRisk;
        const matchesSearch =
          !searchQuery.trim() ||
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.businessName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesRisk && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "ROI") return b.expectedRoiPercent - a.expectedRoiPercent;
        if (sortBy === "FUNDED")
          return (
            b.raisedAmount / b.targetAmount -
            a.raisedAmount / a.targetAmount
          );
        if (sortBy === "MIN_INVEST") return a.minInvestment - b.minInvestment;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [campaigns, selectedCategory, selectedRisk, searchQuery, sortBy]);

  const handleInvestClick = (campaign: Campaign) => {
    setSelectedCampaignForInvest(campaign);
    setIsInvestModalOpen(true);
  };

  const handleInvestSuccess = (newPledge: Pledge) => {
    setMyPledges((prev) => [newPledge, ...prev]);
    // Update local campaign funding state
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === newPledge.campaignId) {
          return {
            ...c,
            raisedAmount: c.raisedAmount + newPledge.amount,
            investorCount: c.investorCount + 1,
          };
        }
        return c;
      })
    );
  };

  const handleCreateSuccess = (newCampaign: Campaign) => {
    setCampaigns((prev) => [newCampaign, ...prev]);
  };

  return (
    <PublicPageShell
      title="Fractional Investment & Capital Syndication"
      subtitle="Access institution-grade alternative assets, renewable energy microgrids, maritime logistics, and high-growth technology ventures with transparent dividend yields."
      badge="Regulated Investment Hub"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Services", href: "/service" },
        { label: "Investment", href: "/investment" },
      ]}
      action={
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-2 font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Rocket className="h-4 w-4" />
            Raise Capital
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Key Platform Performance Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-primary" /> Total Capital Deployed
            </span>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              ${stats.totalCapitalDeployed.toLocaleString()}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              +28% YoY growth
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-500" /> Active Opportunities
            </span>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              {campaigns.length} Rounds
            </p>
            <span className="text-[11px] text-muted-foreground">Vetted & asset-backed</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-purple-500" /> Average Expected ROI
            </span>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats.averageRoiPercent}% <span className="text-xs font-normal text-muted-foreground">/ yr</span>
            </p>
            <span className="text-[11px] text-muted-foreground">Annualized cash yield</span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-amber-500" /> Global Investors
            </span>
            <p className="mt-2 text-2xl font-extrabold text-foreground">
              {stats.totalInvestorsCount.toLocaleString()}
            </p>
            <span className="text-[11px] text-muted-foreground">In 42 jurisdictions</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("OPPORTUNITIES")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                activeTab === "OPPORTUNITIES"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Briefcase className="h-4 w-4" />
              Syndicated Opportunities ({filteredCampaigns.length})
            </button>
            <button
              onClick={() => setActiveTab("PORTFOLIO")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                activeTab === "PORTFOLIO"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              My Portfolio ({myPledges.length})
            </button>
          </div>
        </div>

        {activeTab === "OPPORTUNITIES" ? (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search opportunities, sectors, or issuers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card pl-10 pr-4 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Risk Filter */}
                <select
                  value={selectedRisk}
                  onChange={(e) => setSelectedRisk(e.target.value)}
                  className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HIGH_GROWTH">High Growth</option>
                </select>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="ROI">Sort: Highest ROI %</option>
                  <option value="FUNDED">Sort: Most Funded</option>
                  <option value="MIN_INVEST">Sort: Lowest Min Ticket</option>
                  <option value="NEWEST">Sort: Newest</option>
                </select>
              </div>
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === cat.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Opportunity Cards Grid */}
            {filteredCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((camp) => (
                  <InvestmentCard
                    key={camp.id}
                    campaign={camp}
                    onInvest={handleInvestClick}
                    onSelect={(c) => setDetailCampaign(c)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card/40 p-12 text-center">
                <Search className="mx-auto h-10 w-10 text-muted-foreground opacity-40" />
                <h3 className="mt-3 text-base font-bold text-foreground">
                  No matching investment rounds
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try adjusting your sector filter, risk profile, or keyword search.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setSelectedRisk("ALL");
                    setSearchQuery("");
                  }}
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          <MyPortfolioTab pledges={myPledges} />
        )}
      </div>

      {/* Investment Execution Modal */}
      <InvestModal
        campaign={selectedCampaignForInvest}
        isOpen={isInvestModalOpen}
        onClose={() => setIsInvestModalOpen(false)}
        onSuccess={handleInvestSuccess}
      />

      {/* Launch Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Detail Prospectus Modal */}
      {detailCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/80 pb-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {detailCampaign.category}
                </span>
                <h2 className="text-xl font-bold text-foreground mt-0.5">
                  {detailCampaign.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Issuer: {detailCampaign.businessName}
                </p>
              </div>
              <button
                onClick={() => setDetailCampaign(null)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {detailCampaign.description}
              </p>

              {detailCampaign.highlights && detailCampaign.highlights.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2">
                    Key Investment Highlights
                  </h4>
                  <ul className="space-y-1.5">
                    {detailCampaign.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Expected Annual ROI</span>
                  <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                    +{detailCampaign.expectedRoiPercent}% / yr
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Equity Stake Available</span>
                  <p className="font-bold text-foreground text-sm">
                    {detailCampaign.equityPercent}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Term Horizon</span>
                  <p className="font-semibold text-foreground">
                    {detailCampaign.termMonths} Months
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Minimum Ticket</span>
                  <p className="font-semibold text-foreground">
                    ${detailCampaign.minInvestment.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/80">
                <Button
                  variant="outline"
                  onClick={() => setDetailCampaign(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const c = detailCampaign;
                    setDetailCampaign(null);
                    handleInvestClick(c);
                  }}
                  className="font-bold gap-2"
                >
                  Proceed to Invest
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PublicPageShell>
  );
};
