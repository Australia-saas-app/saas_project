"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Briefcase, ShieldAlert, MapPin } from "lucide-react";
import type { TechnicalProject } from "../types/project.type";
import { PublicDetailModal } from "@/src/modules/shared/components/public/PublicDetailModal";
import { PublicApplyModal } from "@/src/modules/shared/components/public/PublicApplyModal";
import AppModal from "@/src/modules/dashboard/shared/components/AppModal";
import { Button } from "@/src/components/ui/button";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useUser } from "@/src/context/user.provider";

interface ProjectGridViewProps {
  projects: TechnicalProject[];
  onViewProject?: (project: TechnicalProject) => void;
}

export function ProjectGridView({ projects, onViewProject }: ProjectGridViewProps) {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <article
          key={project.id}
          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card card-lift shadow-sm"
        >
          <div className="h-1.5 bg-primary" />

          <div className="flex flex-1 flex-col p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="rounded-md bg-[#eef2f8] dark:bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                {project.category}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {project.location || "Remote"}
                </span>
                <span className="text-sm font-bold text-primary">{project.priceRange}</span>
              </div>
            </div>

            <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary">
              {project.title}
            </h3>

            <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
              {project.description}
            </p>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {project.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>

            <Button
              type="button"
              className="w-full bg-primary font-semibold hover:bg-primary/90"
              onClick={() => onViewProject?.(project)}
            >
              {t.technical.viewProject}
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function useTechnicalProjectModal() {
  const [selected, setSelected] = useState<TechnicalProject | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyingLoading, setApplyingLoading] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);

  const { user } = useUser();
  const router = useRouter();

  const handleApply = async () => {
    if (!user) {
      router.push(`/account/user/login?redirect=${encodeURIComponent("/technical")}`);
      return;
    }

    setApplyingLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setApplyingLoading(false);

    const role = String((user as any)?.role || "").toLowerCase();
    const isBusiness = role === "business" || role === "seller";

    if (!isBusiness) {
      setBusinessModalOpen(true);
      return;
    }

    setApplyOpen(true);
  };

  const modal = (
    <>
      <PublicDetailModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.title ?? "Project"}
        subtitle={selected?.category}
        fields={
          selected
            ? [
                { label: "Project ID", value: selected.projectId || (selected as any).id || "PRJ-001" },
                { label: "Budget", value: selected.priceRange },
                { label: "Duration", value: selected.duration || "14 Days" },
                {
                  label: "Programming / Technology Languages",
                  value:
                    (selected.languages && selected.languages.length > 0
                      ? selected.languages.join(", ")
                      : (selected as any).preferredLanguages?.join(", ")) || "TypeScript, JavaScript",
                },
                {
                  label: "Required Skills & Frameworks",
                  value:
                    (selected.skills && selected.skills.length > 0
                      ? selected.skills.join(", ")
                      : (selected as any).requiredSkills?.join(", ")) || "React, Tailwind CSS",
                },
                { label: "Description", value: selected.description },
              ]
            : []
        }
        footer={
          selected && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                disabled={applyingLoading}
                className="bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer min-w-[150px]"
                onClick={handleApply}
              >
                {applyingLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Role...
                  </>
                ) : (
                  "Apply to project"
                )}
              </Button>
            </div>
          )
        }
      />

      {/* Business Account Required Modal for User and Affiliate Roles */}
      <AppModal
        open={businessModalOpen}
        onClose={() => setBusinessModalOpen(false)}
        title="Business Account Required"
        description="Application Restriction"
        size="md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {/* Top Amber Glowing Badge */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-8 ring-amber-500/5 shadow-inner">
            <Briefcase className="h-8 w-8 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldAlert className="h-3.5 w-3.5" />
              Service Provider Only
            </span>
            <h3 className="text-lg font-bold text-foreground pt-2">
              Only Business Accounts Can Apply
            </h3>
          </div>

          {/* Explanation Info Card */}
          <div className="rounded-xl border border-border bg-muted/40 dark:bg-muted/20 p-4 text-left space-y-2.5 w-full">
            <p className="text-sm text-foreground leading-relaxed">
              Technical project bidding, delivery submissions, and milestone escrow payouts are exclusively available to registered <strong>Business Service Providers</strong>.
            </p>
            <div className="rounded-lg bg-background/80 border border-border/80 px-3 py-2 text-xs text-muted-foreground">
              <span>Your Account Role: </span>
              <strong className="text-foreground capitalize">{user?.role || "User"}</strong>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Accounts with <strong>User</strong> or <strong>Affiliate</strong> roles cannot apply to client projects. To apply, please switch to or register with a verified Business account.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex w-full justify-end pt-2">
            <Button
              type="button"
              className="w-full sm:w-auto min-w-[120px] bg-primary hover:bg-primary/90 text-white font-bold cursor-pointer"
              onClick={() => setBusinessModalOpen(false)}
            >
              OK
            </Button>
          </div>
        </div>
      </AppModal>

      {selected && (
        <PublicApplyModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          type="technical"
          itemId={String(selected.id)}
          itemTitle={selected.title}
          title="Apply to technical project"
          description="Submit your application. The project owner will review your profile and contact you."
        />
      )}
    </>
  );

  return { selected, setSelected, modal };
}
