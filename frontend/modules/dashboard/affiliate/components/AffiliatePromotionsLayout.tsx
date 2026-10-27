"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, Copy, Link2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { useUser } from "@/src/context/user.provider";
import { getAffiliateReferralCode } from "@/src/shared/lib/demo-user";
import { AFFILIATE_PROMOTIONS, type AffiliatePromotion } from "../data/affiliate-demo-data";

export default function AffiliatePromotionsLayout() {
  const { t } = useLocale();
  const { user } = useUser();
  const { demoOrEmpty } = useIsDemoAccount();
  const referralCode = getAffiliateReferralCode(user);
  const p = t.affiliatePages.promotions;
  const seedPromotions = demoOrEmpty(AFFILIATE_PROMOTIONS, [] as typeof AFFILIATE_PROMOTIONS);
  const [promotions, setPromotions] = useState<AffiliatePromotion[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (seedPromotions.length > 0) {
      setPromotions([...seedPromotions]);
    }
  }, [seedPromotions]);

  const filtered = useMemo(() => {
    if (!search.trim()) return promotions;
    const q = search.toLowerCase();
    return promotions.filter(
      (item) => item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    );
  }, [search, promotions]);

  const copyLink = (link: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}${link}`;
    navigator.clipboard?.writeText(url);
    toast.success(p.linkCopied);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{p.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{p.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {p.createLink}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: p.activeLinks,
            value: String(promotions.filter((x) => x.status === "Active").length),
          },
          { label: p.totalClicks, value: String(promotions.reduce((s, x) => s + x.clicks, 0)) },
          {
            label: p.conversions,
            value: String(promotions.reduce((s, x) => s + x.conversions, 0)),
          },
          { label: p.totalCommission, value: promotions.length ? "$446" : "$0" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-primary">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={p.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none"
            />
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No promotion links yet. Create one to start tracking clicks.
            </p>
          ) : (
            filtered.map((promo) => (
              <div
                key={promo.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-gray-50/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Link2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-gray-900">{promo.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{promo.link}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <MousePointerClick className="h-3.5 w-3.5" /> {promo.clicks} {p.clicks}
                    </span>
                    <span>
                      {promo.conversions} {p.conversionsLabel}
                    </span>
                    <span className="font-semibold text-primary">{promo.commission}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${promo.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {promo.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyLink(promo.link)}
                    className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
                    aria-label="Copy link"
                  >
                    <Copy className="h-4 w-4 text-gray-600" />
                  </button>
                  <Link
                    href={promo.link}
                    target="_blank"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    {p.preview}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {createOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
          <button
            type="button"
            className="fixed inset-0 -z-10"
            aria-label="Close"
            onClick={() => setCreateOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-foreground">
            <h2 className="text-lg font-bold text-foreground">{p.createLink}</h2>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Promotion title"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => {
                if (!newTitle.trim()) {
                  toast.error("Enter a promotion title.");
                  return;
                }
                const link = `/marketplace?ref=${referralCode}&promo=${Date.now()}`;
                setPromotions((prev) => [
                  {
                    id: `PROMO-${String(prev.length + 1).padStart(2, "0")}`,
                    title: newTitle,
                    link,
                    clicks: 0,
                    conversions: 0,
                    commission: "$0",
                    status: "Active",
                  },
                  ...prev,
                ]);
                setNewTitle("");
                setCreateOpen(false);
                toast.success("Promotion link created.");
              }}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              Create Link
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
