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
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import {
  fetchPublicProjects,
  fetchAssignedProjects,
  acceptProject,
  markProjectComplete,
} from "../services/technical.services";
import { useUser } from "@/src/context/user.provider";

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
  deliverableUrls?: string[];
  completionNotes?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function BusinessProjectsPage() {
  const { user } = useUser();
  const businessName =
    user && "businessName" in user && (user as any).businessName
      ? (user as any).businessName
      : user && "name" in user && (user as any).name
        ? (user as any).name
        : "Business Partner";

  const [activeTab, setActiveTab] = useState<"available" | "my-projects">("available");
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Complete modal state
  const [completingProject, setCompletingProject] = useState<Project | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [deliverableList, setDeliverableList] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
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
    loadData();
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle2 className="h-3 w-3" /> Paid &amp; Ready to Accept
                        </span>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {project.submissionStatus === "in_progress" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            <Clock className="h-3 w-3" /> In Progress
                          </span>
                        )}
                        {project.submissionStatus === "completed" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                            <Clock className="h-3 w-3" /> Deliverables Submitted — Under Review
                          </span>
                        )}
                        {project.submissionStatus === "revision" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                            <RotateCcw className="h-3 w-3" /> Revision Requested
                          </span>
                        )}
                        {project.submissionStatus === "accepted" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Completed &amp; Paid
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground">{project.title}</h3>
                      <p className="text-xs text-muted-foreground">{project.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Payout Value</p>
                      <p className="text-lg font-bold text-primary">
                        {project.currency || "USD"} {budget.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {project.adminNotes && project.submissionStatus === "revision" && (
                    <div className="rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 p-3 text-xs text-orange-800 dark:text-orange-200">
                      <strong>Client Revision Request:</strong> {project.adminNotes}
                    </div>
                  )}

                  {project.deliverableUrls && project.deliverableUrls.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Submitted Deliverables:</p>
                      <div className="flex flex-wrap gap-2">
                        {project.deliverableUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Deliverable #{i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground">
                      Client: <span className="font-medium text-foreground">{project.clientName || "Client"}</span>
                    </p>

                    {(project.submissionStatus === "in_progress" || project.submissionStatus === "revision") && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-white font-semibold"
                        onClick={() => {
                          setCompletingProject(project);
                          setDeliverableList(project.deliverableUrls || []);
                          setCompletionNotes(project.completionNotes || "");
                        }}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Submit Deliverables &amp; Complete
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Complete Project Modal */}
      {completingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Submit Deliverables &amp; Complete</h3>
              <button
                onClick={() => setCompletingProject(null)}
                className="rounded-md p-1 hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Provide GitHub repository URLs, live site links, Figma files, or cloud download links for <strong>{completingProject.title}</strong>.
            </p>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Deliverable Link / URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                    placeholder="https://github.com/org/repo or https://drive.google.com/..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={handleAddDeliverable}>
                    Add
                  </Button>
                </div>
              </div>

              {deliverableList.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Added links ({deliverableList.length}):</p>
                  <ul className="max-h-28 overflow-y-auto space-y-1 rounded-lg border border-border p-2 text-xs">
                    {deliverableList.map((url, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 text-foreground">
                        <span className="truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDeliverable(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Completion Notes &amp; Instructions
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Deployment instructions, credentials, or notes for the client..."
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setCompletingProject(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading === completingProject.projectId}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold"
                >
                  {actionLoading === completingProject.projectId ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Submit to Client &amp; Admin
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
