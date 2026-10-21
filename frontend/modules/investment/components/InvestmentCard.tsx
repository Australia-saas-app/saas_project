"use client";

import React from "react";
import Image from "next/image";
import { TrendingUp, ShieldCheck, Users, Calendar, ArrowUpRight, DollarSign } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Campaign } from "../types";

interface InvestmentCardProps {
  campaign: Campaign;
  onInvest: (campaign: Campaign) => void;
  onSelect: (campaign: Campaign) => void;
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({
  campaign,
  onInvest,
  onSelect,
}) => {
  const raised = Number(campaign?.raisedAmount ?? 0);
  const target = Math.max(1, Number(campaign?.targetAmount ?? 1));
  const percentFunded = Math.min(100, Math.round((raised / target) * 100));

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "LOW":
        return {
          label: "Low Risk",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "MODERATE":
        return {
          label: "Moderate",
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        };
      case "HIGH_GROWTH":
      default:
        return {
          label: "High Growth",
          bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        };
    }
  };

  const riskBadge = getRiskBadge(campaign.riskLevel);

  return (
    <div
      onClick={() => onSelect(campaign)}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl cursor-pointer"
    >
      <div>
        {/* Thumbnail Banner */}
        <div className="relative h-48 w-full overflow-hidden bg-muted">
          {campaign.imageUrl || (campaign as any).bannerUrl ? (
            <img
              src={campaign.imageUrl || (campaign as any).bannerUrl}
              alt={campaign.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
              <TrendingUp className="h-12 w-12 opacity-40" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Badges on Top */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="rounded-full bg-background/90 backdrop-blur-md px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
              {campaign.category}
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md ${riskBadge.bg}`}
            >
              {riskBadge.label}
            </span>
          </div>

          {/* Target Highlight Over Image */}
          <div className="absolute bottom-3 left-3 text-white">
            <p className="text-xs font-medium text-white/80">Business</p>
            <p className="text-sm font-semibold truncate max-w-[260px]">
              {campaign.businessName}
            </p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          <h3 className="line-clamp-2 text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            {campaign.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {campaign.description}
          </p>

          {/* Key Metrics Grid */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Expected ROI
              </span>
              <p className="mt-0.5 text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                +{campaign.expectedRoiPercent}%{" "}
                <span className="text-[10px] font-medium text-muted-foreground">/yr</span>
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary" /> Equity Share
              </span>
              <p className="mt-0.5 text-base font-extrabold text-foreground">
                {campaign.equityPercent}%
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Term
              </span>
              <p className="mt-0.5 text-xs font-bold text-foreground">
                {campaign.termMonths} Months
              </p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Min Entry
              </span>
              <p className="mt-0.5 text-xs font-bold text-foreground">
                ${Number(campaign?.minInvestment ?? 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Funding Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                ${Number(campaign?.raisedAmount ?? 0).toLocaleString()}{" "}
                <span className="font-normal text-muted-foreground">
                  of ${Number(campaign?.targetAmount ?? 0).toLocaleString()}
                </span>
              </span>
              <span className="font-bold text-primary">{percentFunded}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700"
                style={{ width: `${percentFunded}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {campaign.investorCount} Backers
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {campaign.status === "ACTIVE" ? "Open for Investment" : campaign.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-border/70 p-4 bg-muted/10 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs font-semibold"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(campaign);
          }}
        >
          Details
        </Button>
        <Button
          size="sm"
          className="flex-1 text-xs font-semibold gap-1.5 shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onInvest(campaign);
          }}
        >
          Invest Now
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
