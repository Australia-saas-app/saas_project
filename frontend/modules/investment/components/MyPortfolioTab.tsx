"use client";

import React, { useState } from "react";
import { TrendingUp, ShieldCheck, DollarSign, Wallet, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { Pledge } from "../types";

interface MyPortfolioTabProps {
  pledges: Pledge[];
}

export const MyPortfolioTab: React.FC<MyPortfolioTabProps> = ({ pledges }) => {
  const [claimedDividends, setClaimedDividends] = useState<Record<string, boolean>>({});

  const totalInvested = pledges.reduce((sum, p) => sum + p.amount, 0);
  const totalAnnualDividends = pledges.reduce(
    (sum, p) => sum + (p.expectedAnnualReturn || 0),
    0
  );
  const averageYield = totalInvested > 0
    ? Number(((totalAnnualDividends / totalInvested) * 100).toFixed(1))
    : 0;

  const handleClaim = (pledgeId: string, amount: number) => {
    setClaimedDividends((prev) => ({ ...prev, [pledgeId]: true }));
    toast.success(`Claimed dividend payment of $${amount.toLocaleString()} credited to Vero Wallet!`);
  };

  if (pledges.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <TrendingUp className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-foreground">No Investments Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          Explore curated opportunities across Renewable Energy, Maritime, AI, and Commercial Real Estate to build your fractional equity and dividend portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-primary" /> Total Capital Invested
          </span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            ${totalInvested.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted-foreground">Across {pledges.length} campaign stakes</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Projected Annual Yield
          </span>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            +${totalAnnualDividends.toLocaleString()}
          </p>
          <span className="text-[11px] text-muted-foreground">Quarterly dividend disbursements</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-purple-500" /> Blended Portfolio Return
          </span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            {averageYield}%
          </p>
          <span className="text-[11px] text-muted-foreground">Weighted average ROI</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-amber-500" /> Next Payout Cycle
          </span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">
            In 18 Days
          </p>
          <span className="text-[11px] text-muted-foreground">Direct automated wallet deposit</span>
        </div>
      </div>

      {/* Active Holdings Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/80 flex items-center justify-between">
          <h3 className="font-bold text-foreground">Active Investment Holdings</h3>
          <span className="text-xs text-muted-foreground font-medium">
            {pledges.length} Verified Stakes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-3 px-4 font-semibold">Venture / Campaign</th>
                <th className="py-3 px-4 font-semibold">Invested</th>
                <th className="py-3 px-4 font-semibold">Equity Stake</th>
                <th className="py-3 px-4 font-semibold">Est. Annual Return</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Dividend Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              {pledges.map((p) => {
                const quarterly = Math.round((p.expectedAnnualReturn || p.amount * 0.15) / 4);
                const isClaimed = claimedDividends[p.id];

                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground text-sm">
                        {p.campaign?.title || p.campaignTitle || "Syndicated Asset"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Tx: {p.transactionId || p.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm">
                      ${p.amount.toLocaleString()} {p.currency}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {p.equitySharePercent}%
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      +${(p.expectedAnnualReturn || Math.round(p.amount * 0.15)).toLocaleString()} / yr
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Confirmed
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isClaimed ? (
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Claimed to Wallet
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => handleClaim(p.id, quarterly)}
                        >
                          Claim Qtr (${quarterly})
                          <ArrowUpRight className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
