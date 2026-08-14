"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Eye,
  RotateCcw,
  Loader2,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
  fetchMyProjects,
  reviewAcceptProject,
  requestRevision,
  submitProject,
} from "../services/technical.services";
import { PayProjectModal } from "./PayProjectModal";
import Link from "next/link";

type SubmissionStatus =
  | "draft"
  | "submitted"
  | "admin_review"
  | "approved"
  | "payment_pending"
  | "active"
  | "in_progress"
  | "completed"
  | "revision"
  | "accepted"
  | "rejected";

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  submitted: { label: "Submitted", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: <Clock className="h-3.5 w-3.5" /> },
  admin_review: { label: "Under Review", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", icon: <Eye className="h-3.5 w-3.5" /> },
  approved: { label: "Approved — Pay Now", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: <CreditCard className="h-3.5 w-3.5" /> },
  payment_pending: { label: "Payment Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300", icon: <CreditCard className="h-3.5 w-3.5" /> },
  active: { label: "Active — Available", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  in_progress: { label: "In Progress", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300", icon: <Loader2 className="h-3.5 w-3.5" /> },
  completed: { label: "Completed — Review", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", icon: <Eye className="h-3.5 w-3.5" /> },
  revision: { label: "Revision Requested", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", icon: <RotateCcw className="h-3.5 w-3.5" /> },
  accepted: { label: "Accepted — Done", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: <XCircle className="h-3.5 w-3.5" /> },
};

interface Project {
  id: number;
  projectId: string;
  title: string;
  description: string;
  submissionStatus: SubmissionStatus;
  paymentStatus: string;
  adminBudget?: number;
  price?: number;
  currency?: string;
  category?: string;
  skills?: string[];
  assignedBusinessName?: string;
  completionNotes?: string;
  deliverableUrls?: string[];
  createdAt: string;
}

export default function UserProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [payProject, setPayProject] = useState<Project | null>(null);
  const [revisionProject, setRevisionProject] = useState<Project | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const data = await fetchMyProjects();
      setProjects(data?.projects || []);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleSubmit = async (project: Project) => {
    setActionLoading(project.projectId);
    try {
      await submitProject(project.projectId);
      toast.success("Project submitted for admin review!");
      await loadProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewAccept = async (project: Project) => {
    setActionLoading(project.projectId);
    try {
      await reviewAcceptProject(project.projectId);
      toast.success("Project accepted! Payment is being released to the business.");
      await loadProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to accept");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevision = async () => {
    if (!revisionProject || !revisionReason.trim()) return;
    setActionLoading(revisionProject.projectId);
    try {
      await requestRevision(revisionProject.projectId, revisionReason);
      toast.success("Revision requested. The business has been notified.");
      setRevisionProject(null);
      setRevisionReason("");
      await loadProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to request revision");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold text-foreground">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first project to get started.</p>
        </div>
        <Button asChild>
          <Link href="/user/technical/create">
            <Plus className="mr-1 h-4 w-4" /> Create Project
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {projects.map((project) => {
        const statusCfg = STATUS_CONFIG[project.submissionStatus] ?? STATUS_CONFIG.draft;
        const budget = project.adminBudget || project.price || 0;
        const isActioning = actionLoading === project.projectId;

        return (
          <div
            key={project.projectId}
            className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.color}`}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                  {project.category && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {project.category}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground">{project.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>

                {budget > 0 && (
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Budget:{" "}
                    <span className="text-primary">
                      {project.currency || "USD"} {Number(budget).toLocaleString()}
                    </span>
                  </p>
                )}

                {project.assignedBusinessName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Business: <span className="font-medium">{project.assignedBusinessName}</span>
                  </p>
                )}

                {project.completionNotes && (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Completion Notes</p>
                    <p className="mt-0.5 text-sm text-foreground">{project.completionNotes}</p>
                  </div>
                )}

                {project.deliverableUrls && project.deliverableUrls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {project.deliverableUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:underline"
                      >
                        Deliverable {i + 1}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
                {project.submissionStatus === "draft" && (
                  <Button
                    size="sm"
                    onClick={() => handleSubmit(project)}
                    disabled={isActioning}
                  >
                    {isActioning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Submit for Review
                  </Button>
                )}

                {project.submissionStatus === "approved" && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => setPayProject(project)}
                  >
                    <CreditCard className="mr-1 h-3 w-3" />
                    Pay Now — {project.currency || "USD"} {Number(budget).toLocaleString()}
                  </Button>
                )}

                {project.submissionStatus === "completed" && (
                  <>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleReviewAccept(project)}
                      disabled={isActioning}
                    >
                      {isActioning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                      Accept & Release Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRevisionProject(project); setRevisionReason(""); }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Request Revision
                    </Button>
                  </>
                )}

                <p className="text-xs text-muted-foreground">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pay Modal */}
      {payProject && (
        <PayProjectModal
          project={payProject}
          onClose={() => setPayProject(null)}
          onSuccess={() => { setPayProject(null); loadProjects(); }}
        />
      )}

      {/* Revision Modal */}
      {revisionProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-foreground">Request Revision</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe what needs to be corrected for <strong>{revisionProject.title}</strong>.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
              placeholder="Describe the required changes..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRevisionProject(null)}>Cancel</Button>
              <Button
                onClick={handleRevision}
                disabled={!revisionReason.trim() || !!actionLoading}
              >
                {actionLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                Submit Revision Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
