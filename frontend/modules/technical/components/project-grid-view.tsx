"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Briefcase, ShieldAlert, MapPin, BadgeCheck, Eye, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import type { TechnicalProject } from "../types/project.type";
import { PublicDetailModal } from "@/src/modules/shared/components/public/PublicDetailModal";
import { PublicApplyModal } from "@/src/modules/shared/components/public/PublicApplyModal";
import AppModal from "@/src/modules/dashboard/shared/components/AppModal";
import { Button } from "@/src/components/ui/button";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useUser } from "@/src/context/user.provider";
import { recordActivityLog, fetchMyApplications, applyForProject } from "../services/technical.services";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import { DeliverableUploadModal } from "./DeliverableUploadModal";

interface ProjectGridViewProps {
  projects: TechnicalProject[];
  onViewProject?: (project: TechnicalProject) => void;
}

export function ProjectGridView({ projects, onViewProject }: ProjectGridViewProps) {
  const { t } = useLocale();
  const { user } = useUser();
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [deliverableProject, setDeliverableProject] = useState<TechnicalProject | null>(null);
  const isBusiness = user?.role === "business" || user?.role === "user";
  const uId = String((user as any)?.id || (user as any)?.userId || "");

  const updateApplied = async () => {
    if (!uId) {
      setAppliedIds([]);
      return;
    }

    let storageIds: string[] = [];
    if (typeof window !== "undefined") {
      try {
        storageIds = JSON.parse(localStorage.getItem(`business_applied_projects_${uId}`) || "[]");
      } catch {}
    }

    try {
      const res = await fetchMyApplications();
      const dbIds: string[] = Array.isArray(res?.appliedProjectIds) ? res.appliedProjectIds : [];
      const merged = Array.from(new Set([...storageIds, ...dbIds]));
      setAppliedIds(merged);
      const currentStr = localStorage.getItem(`business_applied_projects_${uId}`);
      const newStr = JSON.stringify(merged);
      if (currentStr !== newStr && typeof window !== "undefined") {
        localStorage.setItem(`business_applied_projects_${uId}`, newStr);
      }
    } catch {
      setAppliedIds(storageIds);
    }
  };

  useEffect(() => {
    updateApplied();
    window.addEventListener("applied_projects_updated", updateApplied);
    window.addEventListener("storage", updateApplied);
    return () => {
      window.removeEventListener("applied_projects_updated", updateApplied);
      window.removeEventListener("storage", updateApplied);
    };
  }, [uId]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const pId = String(project.projectId || project.id);
        const isApplied = Boolean(
          isBusiness && (
            appliedIds.includes(pId) ||
            appliedIds.includes(String(project.projectId)) ||
            appliedIds.includes(String(project.id)) ||
            appliedIds.includes(`PRJ-${project.id}`)
          )
        );

        const userEmail = (user as any)?.email?.toLowerCase();
        const isAssignedToMe = Boolean(
          isBusiness && (
            (project.assignedBusinessId && (project.assignedBusinessId === uId || project.assignedBusinessId === (user as any)?.userId)) ||
            (project.assignedBusinessUserId && (project.assignedBusinessUserId === uId || project.assignedBusinessUserId === (user as any)?.userId)) ||
            (project.assignedBusinessEmail && userEmail && (project.assignedBusinessEmail.toLowerCase() === userEmail))
          )
        );

        const hasAnyAssignedBusiness = Boolean(
          project.assignedBusinessId ||
          project.assignedBusinessUserId ||
          project.assignedBusinessName ||
          project.submissionStatus === "in_progress"
        );

        const isNotChosen = Boolean(
          isBusiness && isApplied && hasAnyAssignedBusiness && !isAssignedToMe
        );

        return (
          <article
            key={project.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card card-lift shadow-sm"
          >
            <div className="h-1.5 bg-primary" />

            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary self-start">
                    {project.projectId || `PRJ-${project.id}`}
                  </span>
                  {isAssignedToMe ? (
                    <span className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Active
                    </span>
                  ) : isNotChosen ? (
                    <span className="rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Thank you for applying, Better Luck Next time
                    </span>
                  ) : isApplied ? (
                    <span className="rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                      Pending for Client Approval
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Active for Public
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-md bg-[#eef2f8] dark:bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {project.category || "Software Development"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {project.location || "Remote"}
                    </span>
                    <span className="text-sm font-bold text-primary">{project.priceRange}</span>
                  </div>
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

              {isApplied || isAssignedToMe ? (
                <div className="flex items-center justify-between gap-3 pt-2 mt-auto">
                  <button
                    type="button"
                    title="View Project Details"
                    disabled={isNotChosen}
                    onClick={() => onViewProject?.(project)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {isAssignedToMe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setDeliverableProject(project)}
                        className="flex-1 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-primary font-bold text-xs px-3.5 py-2 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        <span>Submit Project</span>
                      </button>
                      <div className="inline-flex items-center gap-1.5 border-2 border-dashed border-emerald-600 dark:border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black uppercase text-[11px] px-3 py-1 rounded-md tracking-wider transform -rotate-12 shadow-sm select-none shrink-0">
                        <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                        Assigned
                      </div>
                    </>
                  ) : isNotChosen ? (
                    <span className="text-[11px] font-bold text-muted-foreground italic">
                      Position Closed
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onViewProject?.(project)}
                        className="flex-1 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-primary font-bold text-xs px-3.5 py-2 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>View Project</span>
                      </button>
                      <div className="inline-flex items-center gap-1.5 border-2 border-dashed border-emerald-600 dark:border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black uppercase text-[11px] px-3 py-1 rounded-md tracking-wider transform -rotate-12 shadow-sm select-none shrink-0">
                        <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                        Applied
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 pt-2 mt-auto">
                  <button
                    type="button"
                    title="View Project Details"
                    onClick={() => onViewProject?.(project)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border transition-all cursor-pointer shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <Button
                    type="button"
                    className="flex-1 bg-primary font-semibold hover:bg-primary/90 cursor-pointer"
                    onClick={() => onViewProject?.(project)}
                  >
                    {t.technical.viewProject}
                  </Button>
                </div>
              )}
            </div>
          </article>
        );
      })}

      {deliverableProject && (
        <DeliverableUploadModal
          project={{
            projectId: String(deliverableProject.projectId || deliverableProject.id || ""),
            title: deliverableProject.title,
            deliverableUrls: (deliverableProject as any).deliverableUrls,
            deliverableFiles: (deliverableProject as any).deliverableFiles,
            completionNotes: (deliverableProject as any).completionNotes,
          }}
          onClose={() => setDeliverableProject(null)}
          onSuccess={() => {
            setDeliverableProject(null);
            updateApplied();
            toast.success("Deliverables submitted for client review!");
          }}
        />
      )}
    </div>
  );
}

import axiosInstance from "@/src/lib/axiosInstance";

export function useTechnicalProjectModal() {
  const [selected, setSelected] = useState<TechnicalProject | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyingLoading, setApplyingLoading] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  const { user } = useUser();
  const router = useRouter();

  const rawRole = String((user as any)?.role || (user as any)?.accountType || "").toLowerCase().trim();
  const isBusiness = Boolean(
    user && (rawRole === "business" || rawRole === "seller" || rawRole === "company")
  );
  const uId = (user as any)?.id || (user as any)?.userId || (user as any)?.sub;
  const appliedKey = uId ? `business_applied_projects_${uId}` : null;

  const [appliedModalIds, setAppliedModalIds] = useState<string[]>([]);

  useEffect(() => {
    const update = async () => {
      if (!uId) {
        setAppliedModalIds([]);
        return;
      }
      try {
        const local = appliedKey ? JSON.parse(localStorage.getItem(appliedKey) || "[]") : [];
        const res = await fetchMyApplications();
        const dbIds = Array.isArray(res?.appliedProjectIds) ? res.appliedProjectIds : [];
        const merged = Array.from(new Set([...local, ...dbIds]));
        setAppliedModalIds(merged);
        if (appliedKey && dbIds.length > 0) {
          const cur = localStorage.getItem(appliedKey);
          const next = JSON.stringify(merged);
          if (cur !== next) {
            localStorage.setItem(appliedKey, next);
          }
        }
      } catch {}
    };
    update();
    window.addEventListener("applied_projects_updated", update);
    return () => {
      window.removeEventListener("applied_projects_updated", update);
    };
  }, [uId, appliedKey]);

  const isApplied = Boolean(
    isBusiness &&
      selected && (
        appliedModalIds.includes(String(selected.projectId)) ||
        appliedModalIds.includes(String((selected as any).id)) ||
        appliedModalIds.includes(`PRJ-${(selected as any).id}`)
      )
  );

  const handleApply = async () => {
    if (!user) {
      router.push(`/account/business/login?redirect=${encodeURIComponent("/business/services")}`);
      return;
    }

    setApplyingLoading(true);

    if (!isBusiness) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setApplyingLoading(false);
      setBusinessModalOpen(true);
      return;
    }

    // 1. Check business KYC verification status with spinner active
    let isVerified = false;
    let latestUser: any = null;
    try {
      const res = await axiosInstance.get("/sso/auth/me").catch(() => null);
      latestUser = res?.data?.data?.user || res?.data?.user || res?.data;
      const kyc = String(latestUser?.kycStatus || (user as any)?.kycStatus || "").toLowerCase();
      const st = String(latestUser?.status || (user as any)?.status || "").toLowerCase();
      isVerified = kyc === "approved" || kyc === "verified" || st === "verified";
    } catch {
      const kyc = String((user as any)?.kycStatus || "").toLowerCase();
      const st = String((user as any)?.status || "").toLowerCase();
      isVerified = kyc === "approved" || kyc === "verified" || st === "verified";
    }

    if (typeof window !== "undefined" && !isVerified) {
      try {
        const uid = (user as any)?.id || (user as any)?.userId || (user as any)?.sub;
        if (uid) {
          const raw = localStorage.getItem(`user_profile_overrides_${uid}`) || localStorage.getItem(`business_profile_overrides_${uid}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.kycStatus?.toLowerCase() === "approved" || parsed?.status?.toLowerCase() === "verified") {
              isVerified = true;
            }
          }
        }
      } catch {}
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    // If unverified, show KYC Verification Required modal
    if (!isVerified) {
      setApplyingLoading(false);
      setKycModalOpen(true);
      return;
    }

    if (selected) {
      const pId = String(selected.projectId || (selected as any).id || "PRJ");

      let profileOverrides: any = {};
      if (typeof window !== "undefined" && uId) {
        try {
          const storedOverrides =
            localStorage.getItem(`profile_overrides_${uId}`) ||
            localStorage.getItem(`business_profile_overrides_${uId}`);
          if (storedOverrides) profileOverrides = JSON.parse(storedOverrides);
        } catch {}
      }

      const userFirstName = latestUser?.firstName || (user as any)?.firstName || (user as any)?.first_name || "";
      const userLastName = latestUser?.lastName || (user as any)?.lastName || (user as any)?.last_name || "";
      const fullNameCombined = [userFirstName, userLastName].filter(Boolean).join(" ");
      const realFullName =
        latestUser?.fullName ||
        fullNameCombined ||
        profileOverrides.fullName ||
        (user as any)?.fullName ||
        (user as any)?.name ||
        (user as any)?.userName ||
        latestUser?.email?.split("@")[0] ||
        (user as any)?.email?.split("@")[0] ||
        "";

      const realBusinessName =
        latestUser?.businessName ||
        latestUser?.businessInfo?.businessName ||
        profileOverrides.businessName ||
        (user as any)?.businessName ||
        (user as any)?.businessInfo?.businessName ||
        (user as any)?.companyName ||
        "";

      const realBusinessType =
        latestUser?.businessType ||
        latestUser?.businessInfo?.businessIndustry ||
        latestUser?.businessInfo?.businessType ||
        profileOverrides.businessType ||
        profileOverrides.businessIndustry ||
        (user as any)?.businessType ||
        (user as any)?.businessInfo?.businessIndustry ||
        (user as any)?.businessInfo?.businessType ||
        (user as any)?.businessIndustry ||
        (user as any)?.industry ||
        "";

      const realCustomId =
        latestUser?.customId ||
        latestUser?.businessId ||
        (user as any)?.customId ||
        (user as any)?.businessId ||
        `BSN-${String((user as any)?.id || (user as any)?.userId || "01").slice(-4).padStart(2, "0")}`;

      // Save proposal to PostgreSQL database
      try {
        await applyForProject(pId, {
          proposal: `Business application for project "${selected.title}"`,
          price: parseFloat(String(selected.priceRange || "").replace(/[^0-9.]/g, "")) || 0,
          currency: "USD",
          timeline: "14 Days",
          paymentType: "one-time",
          businessName: realBusinessName,
          userName: realFullName,
          fullName: realFullName,
          businessType: realBusinessType,
          businessId: realCustomId,
          email: latestUser?.email || (user as any)?.email || "",
          userEmail: latestUser?.email || (user as any)?.email || "",
          kycStatus: "verified",
        });
      } catch (e: any) {
        console.error("applyForProject api error:", e);
      }

      const allIds = [pId, selected.projectId, String((selected as any).id), `PRJ-${(selected as any).id}`].filter(Boolean) as string[];
      setAppliedModalIds((prev) => Array.from(new Set([...prev, ...allIds])));

      if (appliedKey && typeof window !== "undefined") {
        try {
          const existing = JSON.parse(localStorage.getItem(appliedKey) || "[]");
          const merged = Array.from(new Set([...existing, ...allIds]));
          localStorage.setItem(appliedKey, JSON.stringify(merged));
        } catch {}
      }

      try {
        recordActivityLog({
          title: `Applied to project: "${selected.title}" (${pId})`,
          description: `Applied for project with budget ${selected.priceRange || ""}. Status: Pending for Client Approval.`,
          category: "Technical Services",
          type: "PROJECT_APPLIED",
          userId: uId,
          userName: realFullName,
          email: (user as any)?.email,
        });
        await recordRealActivity(
          "PROJECT_APPLIED",
          `Applied for project "${selected.title}" (${pId}). Status: Pending for Client Approval.`,
          {
            userId: uId,
            email: (user as any)?.email,
            fullName: realFullName,
            name: realFullName,
          }
        );
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("applied_projects_updated"));
      }

      toast.success(`Successfully applied to project "${selected.title}" (${pId})! Pending client approval.`);
    }

    setApplyingLoading(false);
    setSelected(null);
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
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" className="cursor-pointer" onClick={() => setSelected(null)}>
                Close
              </Button>
              {isApplied ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending for Client Approval
                </div>
              ) : (
                <Button
                  disabled={applyingLoading}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold cursor-pointer min-w-[150px]"
                  onClick={handleApply}
                >
                  {applyingLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply to project"
                  )}
                </Button>
              )}
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row w-full justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto cursor-pointer"
              onClick={() => setBusinessModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto min-w-[140px] bg-primary hover:bg-primary/90 text-white font-bold cursor-pointer"
              onClick={() => {
                setBusinessModalOpen(false);
                router.push(`/account/business/login?redirect=${encodeURIComponent("/business/services")}`);
              }}
            >
              Sign in with Business
            </Button>
          </div>
        </div>
      </AppModal>

      {/* Business KYC Verification Required Modal */}
      <AppModal
        open={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        title="Verification Required"
        description="Business Account Verification"
        size="md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          {/* Glowing Shield Badge */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-500 shadow-lg shadow-amber-500/10">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>

          {/* Tag & Title */}
          <div className="space-y-1 mt-0.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              &quot;Unverified&quot; Business Account
            </span>
            <h3 className="text-lg font-extrabold text-foreground tracking-tight pt-1">
              Business KYC Verification Required
            </h3>
          </div>

          {/* Main message */}
          <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
            Please submit your Business KYC application to verify your company account before applying for client projects.
          </p>

          {/* Info Card */}
          <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-3.5 text-left text-xs space-y-1">
            <p className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Identity &amp; Business Verification Required
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed pl-5">
              To protect project milestones, escrow disbursements, and client quality standards, all business service providers must complete KYC identity verification prior to submitting project bids or applications.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row w-full justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setKycModalOpen(false)}
              className="w-full sm:w-auto min-w-[100px] border-border text-foreground hover:bg-muted cursor-pointer"
            >
              OK
            </Button>
            <Button
              type="button"
              onClick={() => {
                setKycModalOpen(false);
                router.push("/dashboard/business/profile");
              }}
              className="w-full sm:w-auto min-w-[140px] bg-primary hover:bg-primary/90 text-white font-bold cursor-pointer shadow-md"
            >
              Apply for KYC
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
