"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  FolderOpen,
  Loader2,
  Plus,
  RotateCcw,
  Send,
  Upload,
  UserCheck,
  X,
  MessageSquare,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import {
  fetchPublicProjects,
  fetchAssignedProjects,
  acceptProject,
  markProjectComplete,
  formatProjectDate,
  readLocalProjects,
} from "../services/technical.services";
import { useUser } from "@/src/context/user.provider";
import { ProjectChatModal } from "./ProjectChatModal";
import { DeliverableUploadModal } from "./DeliverableUploadModal";
import { ProjectDeadlineCountdown } from "./ProjectDeadlineCountdown";

interface Project {
  id: number;
  projectId: string;
  title: string;
  description: string;
  submissionStatus: string;
  paymentStatus: string;
  adminBudget?: number;
  price?: number;
  currency?: string;
  category?: string;
  requirements?: string;
  conditions?: string;
  skills?: string[];
  clientName?: string;
  assignedBusinessId?: string;
  assignedBusinessName?: string;
  paymentTerms?: string;
  milestones?: any[];
  deliverableUrls?: string[];
  completionNotes?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function BusinessProjectsPage() {
  const router = useRouter();
  const { user } = useUser();
  const businessName =
    user && "businessName" in user && (user as any).businessName
      ? (user as any).businessName
      : user && "name" in user && (user as any).name
        ? (user as any).name
        : "Business Partner";

  const [activeTab, setActiveTab] = useState<"available" | "my-projects">("available");
  const [availableProjects, setAvailableProjects] = useState<Project[]>(() =>
    readLocalProjects().filter((p) => p.submissionStatus === "active")
  );
  const [myProjects, setMyProjects] = useState<Project[]>(() =>
    readLocalProjects().filter((p) => p.submissionStatus !== "active")
  );
  const [loading, setLoading] = useState(() => (typeof window !== "undefined" ? readLocalProjects().length === 0 : false));
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);

  // Complete modal state
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [deliverableList, setDeliverableList] = useState<string[]>([]);

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [pubRes, myRes] = await Promise.all([
        fetchPublicProjects().catch(() => ({ projects: [] })),
        fetchAssignedProjects().catch(() => ({ projects: [] })),
      ]);
      setAvailableProjects(pubRes?.projects || []);
      setMyProjects(myRes?.projects || []);
    } catch {
      toast.error("Failed to load business projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cached = readLocalProjects();
    if (cached.length === 0) {
      loadData(true);
    } else {
      loadData(false);
    }
    const bgSync = () => loadData(false);
    window.addEventListener("storage", bgSync);
    window.addEventListener("focus", bgSync);
    window.addEventListener("applied_projects_updated", bgSync);
    return () => {
      window.removeEventListener("storage", bgSync);
      window.removeEventListener("focus", bgSync);
      window.removeEventListener("applied_projects_updated", bgSync);
    };
  }, [loadData]);

  const handleAccept = async (project: Project) => {
    setActionLoading(project.projectId);
    try {
      await acceptProject(project.projectId, businessName);
      toast.success(`Project "${project.title}" accepted! You can now start working on it.`);
      await loadData();
      setActiveTab("my-projects");
    } catch (e: any) {
      toast.error(e.message || "Failed to accept project");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddDeliverable = () => {
    if (!deliverableUrl.trim()) return;
    setDeliverableList([...deliverableList, deliverableUrl.trim()]);
    setDeliverableUrl("");
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverableList(deliverableList.filter((_, i) => i !== idx));
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingProject) return;
    if (deliverableList.length === 0 && !deliverableUrl.trim()) {
      toast.error("Please add at least one deliverable link or file URL.");
      return;
    }

    const finalUrls = deliverableUrl.trim()
      ? [...deliverableList, deliverableUrl.trim()]
      : deliverableList;

    setActionLoading(completingProject.projectId);
    try {
      await markProjectComplete(completingProject.projectId, {
        deliverableUrls: finalUrls,
        completionNotes: completionNotes.trim() || "Project completed as specified.",
      });
      toast.success("Deliverables submitted! Client & Admin will review and release payment.");
      setCompletingProject(null);
      setDeliverableUrl("");
      setCompletionNotes("");
      setDeliverableList([]);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark project complete");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Tabs and Create Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "available" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("available")}
            className={activeTab === "available" ? "bg-primary text-white" : ""}
          >
            <Briefcase className="mr-1.5 h-4 w-4" />
            Available Public Projects ({availableProjects.length})
          </Button>
          <Button
            variant={activeTab === "my-projects" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("my-projects")}
            className={activeTab === "my-projects" ? "bg-primary text-white" : ""}
          >
            <UserCheck className="mr-1.5 h-4 w-4" />
            My Working Projects ({myProjects.length})
          </Button>
        </div>

        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/business/technical/create">
            <Plus className="mr-1.5 h-4 w-4" />
            Post Technical Service
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "available" ? (
        /* AVAILABLE PROJECTS FOR BUSINESS TO ACCEPT */
        availableProjects.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">No available projects right now</p>
            <p className="max-w-md text-xs text-muted-foreground">
              When clients submit technical project requests, admin approves them, and clients complete escrow payment, they will appear here for you to accept.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {availableProjects.map((project) => {
              const budget = Number(project.adminBudget || project.price || 0);
              const isActioning = actionLoading === project.projectId;

              return (
                <div
                  key={project.projectId}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md whitespace-nowrap">
                            {project.projectId}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3" /> Paid &amp; Ready to Accept
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-foreground">{project.title}</h3>
                      </div>
                      <p className="text-lg font-extrabold text-primary">
                        {project.currency || "USD"} {budget.toLocaleString()}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {project.description}
                    </p>

                    {project.requirements && (
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Requirements &amp; Conditions
                        </p>
                        <p className="mt-0.5 text-xs text-foreground">{project.requirements}</p>
                      </div>
                    )}

                    {project.skills && project.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {project.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">
                      Client: <span className="font-medium text-foreground">{project.clientName || "Verified Client"}</span>
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(project)}
                      disabled={isActioning}
                      className="bg-primary hover:bg-primary/90 text-white font-semibold"
                    >
                      {isActioning ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Accepting...
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Accept Project
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* MY ASSIGNED PROJECTS */
        myProjects.length === 0 ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">No active working projects</p>
            <p className="max-w-md text-xs text-muted-foreground">
              Go to the &quot;Available Public Projects&quot; tab to browse and accept new client projects.
            </p>
            <Button size="sm" variant="outline" onClick={() => setActiveTab("available")}>
              Browse Available Projects
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {myProjects.map((project) => {
              const budget = Number(project.adminBudget || project.price || 0);
              const isActioning = actionLoading === project.projectId;

              return (
                <div
                  key={project.projectId}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4"
                >
                  {/* Header Row: ID, Status, and Category Pill */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {project.projectId}
                        </span>
                        {project.submissionStatus === "in_progress" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            <Clock className="h-3 w-3" /> In Progress
                          </span>
                        )}
                        {project.submissionStatus === "completed" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> Deliverables Submitted — Under Review
                          </span>
                        )}
                        {project.submissionStatus === "revision" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300">
                            <RotateCcw className="h-3 w-3" /> Revision Requested
                          </span>
                        )}
                        {project.submissionStatus === "accepted" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Completed &amp; Paid
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground">{project.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{project.description}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <ProjectDeadlineCountdown
                        projectId={project.projectId || String(project.id)}
                        endDate={(project as any).endDate}
                        createdAt={project.createdAt}
                        assignedAt={(project as any).assignedAt}
                      />
                      <span className="rounded-lg bg-muted border border-border/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                        {project.category || "Software Development"}
                      </span>
                    </div>
                  </div>

                  {/* Middle Bar Separator: Budget & Client info */}
                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Payout Value
                      </p>
                      <p className="text-sm font-extrabold text-primary">
                        {project.currency || "USD"} ${budget.toLocaleString()}
                      </p>
                      {(() => {
                        const terms = (project.paymentTerms || "").toLowerCase();
                        const mCount = terms.includes("three") || terms === "3" ? 3 : terms.includes("two") || terms === "2" ? 2 : 1;
                        if (mCount > 1 && budget > 0) {
                          const perMs = budget / mCount;
                          return (
                            <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground font-semibold">
                              {Array.from({ length: mCount }, (_, i) => (
                                <p key={i}>
                                  Milestone {i + 1} Payment:{" "}
                                  <span className="text-foreground font-bold">
                                    {project.currency || "USD"} ${perMs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                        Client
                      </p>
                      <p className="text-xs font-semibold text-foreground">
                        {project.clientName || "Client"}
                      </p>
                    </div>
                  </div>

                  {project.adminNotes && project.submissionStatus === "revision" && (
                    <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-3 text-xs text-orange-800 dark:text-orange-200">
                      <strong>Client Revision Request:</strong> {project.adminNotes}
                    </div>
                  )}

                  {/* Actions Footer with Separator */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">
                      Status: <span className="font-semibold text-foreground capitalize">{project.submissionStatus?.replace("_", " ") || "Active"}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className={[
                          "rounded-xl text-xs font-semibold cursor-pointer shadow-xs",
                          project.submissionStatus === "completed"
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : project.submissionStatus === "accepted"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-primary hover:bg-primary/90 text-white",
                        ].join(" ")}
                        onClick={() => {
                          setCompletingProject(project);
                          setDeliverableList(project.deliverableUrls || []);
                          setCompletionNotes(project.completionNotes || "");
                        }}
                      >
                        {project.submissionStatus === "completed" ? (
                          <>
                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                            Submitted Deliverables (Under Review)
                          </>
                        ) : project.submissionStatus === "accepted" ? (
                          <>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Deliverables Accepted ✓
                          </>
                        ) : project.submissionStatus === "revision" ? (
                          <>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Resubmit Deliverables (Revision)
                          </>
                        ) : (
                          <>
                            <Upload className="mr-1.5 h-3.5 w-3.5" />
                            Submit Deliverables &amp; Complete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Complete Project Modal with Progress */}
      {completingProject && (
        <DeliverableUploadModal
          project={completingProject as any}
          onClose={() => setCompletingProject(null)}
          onSuccess={() => {
            setCompletingProject(null);
            loadData();
          }}
        />
      )}
      {/* Project Real-Time Chat Modal */}
      {chatProject && (
        <ProjectChatModal
          project={chatProject as any}
          onClose={() => setChatProject(null)}
        />
      )}
    </div>
  );
}
