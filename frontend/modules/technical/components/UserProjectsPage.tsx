"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  RotateCcw,
  Loader2,
  FolderOpen,
  MessageSquare,
  Download,
  FileArchive,
  FileText,
  FileCode,
  ExternalLink,
  Search,
  Trash2,
  Eye,
  X,
  Tag,
  Code2,
  Phone,
  Mail,
  User,
  Paperclip,
  Briefcase,
  Calendar,
  ShieldCheck,
  DollarSign,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
  fetchMyProjects,
  readLocalProjects,
  reviewAcceptProject,
  requestRevision,
  submitProject,
  deleteProject,
} from "../services/technical.services";
import { PayProjectModal } from "./PayProjectModal";
import { ProjectChatModal } from "./ProjectChatModal";

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
  draft: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    icon: <FolderOpen className="h-3.5 w-3.5" />,
  },
  submitted: {
    label: "Under Admin Review",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  },
  admin_review: {
    label: "Under Admin Review",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  },
  approved: {
    label: "Pending for Payment",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    icon: <DollarSign className="h-3.5 w-3.5 text-amber-500" />,
  },
  payment_pending: {
    label: "Pending for Payment",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800",
    icon: <DollarSign className="h-3.5 w-3.5 text-amber-500" />,
  },
  active: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  completed: {
    label: "Completed — Ready to Review",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400 dark:border-teal-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  revision: {
    label: "Revision Requested",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800",
    icon: <RotateCcw className="h-3.5 w-3.5" />,
  },
  accepted: {
    label: "Accepted & Escrow Released",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected by Admin",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

interface Project {
  id: number;
  projectId: string;
  title: string;
  description: string;
  submissionStatus: SubmissionStatus;
  paymentStatus: string;
  adminBudget?: number;
  minBudget?: number;
  price?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  projectType?: string;
  skills?: string[];
  preferredLanguages?: string[];
  paymentTerms?: string;
  commissionPercent?: number;
  adminNotes?: string;
  requirements?: string;
  conditions?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  startDate?: string;
  endDate?: string;
  attachmentFile?: { name: string; size?: number; type?: string; url: string };
  coverUrl?: string;
  assignedBusinessName?: string;
  completionNotes?: string;
  deliverableUrls?: string[];
  deliverableFiles?: { name: string; url: string; size?: number; type?: string; uploadedAt?: string }[];
  createdAt: string;
}

export default function UserProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters and UI Controls
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "budget_high" | "budget_low">("newest");

  // Modals
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [payProject, setPayProject] = useState<Project | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);
  const [revisionProject, setRevisionProject] = useState<Project | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyProjects();
      const list = data?.projects || [];
      const local = readLocalProjects();
      const map = new Map<string, Project>();
      [...list, ...local].forEach((p) => {
        if (p?.projectId) map.set(p.projectId, p);
      });
      setProjects(Array.from(map.values()));
    } catch (err) {
      console.warn("Could not fetch remote projects, using local store:", err);
      setProjects(readLocalProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    window.addEventListener("storage", loadProjects);
    window.addEventListener("focus", loadProjects);
    return () => {
      window.removeEventListener("storage", loadProjects);
      window.removeEventListener("focus", loadProjects);
    };
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

  const handleAccept = async (projectId: string) => {
    setActionLoading(projectId);
    try {
      await reviewAcceptProject(projectId);
      toast.success("Project accepted! Escrow payment released to the provider.");
      await loadProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to accept");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionProject || !revisionReason.trim()) {
      toast.error("Please enter revision instructions for the business.");
      return;
    }
    setActionLoading(revisionProject.projectId);
    try {
      await requestRevision(revisionProject.projectId, revisionReason);
      toast.success("Revision requested from the business.");
      setRevisionProject(null);
      setRevisionReason("");
      await loadProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to request revision");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Are you sure you want to permanently delete this project and all its submitted data?")) return;
    setActionLoading(projectId);
    try {
      await deleteProject(projectId);
      toast.success("Project deleted successfully");
      await loadProjects();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete project");
    } finally {
      setActionLoading(null);
    }
  };

  // Top metric stats calculation
  const stats = useMemo(() => {
    const activeCount = projects.filter(
      (p) => p.submissionStatus === "active" || p.submissionStatus === "in_progress"
    ).length;
    const pendingCount = projects.filter(
      (p) =>
        p.submissionStatus === "submitted" ||
        p.submissionStatus === "admin_review" ||
        p.submissionStatus === "approved" ||
        p.submissionStatus === "payment_pending"
    ).length;
    const completedCount = projects.filter(
      (p) => p.submissionStatus === "completed" || p.submissionStatus === "accepted"
    ).length;
    const totalBudget = projects.reduce((sum, p) => {
      const b = p.adminBudget || p.price || 0;
      return sum + Number(b);
    }, 0);

    return { activeCount, pendingCount, completedCount, totalBudget };
  }, [projects]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Status filter
        if (statusFilter === "active") {
          if (p.submissionStatus !== "active" && p.submissionStatus !== "in_progress") return false;
        } else if (statusFilter === "pending") {
          if (
            p.submissionStatus !== "submitted" &&
            p.submissionStatus !== "admin_review" &&
            p.submissionStatus !== "approved" &&
            p.submissionStatus !== "payment_pending"
          )
            return false;
        } else if (statusFilter === "completed") {
          if (p.submissionStatus !== "completed" && p.submissionStatus !== "accepted") return false;
        }

        // Category filter
        if (categoryFilter !== "all" && p.category !== categoryFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchDesc = (p.description || "").toLowerCase().includes(q);
          const matchCat = (p.category || "").toLowerCase().includes(q);
          const matchSkills = (p.skills || []).some((s) => s.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchCat && !matchSkills) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortOrder === "oldest") {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortOrder === "budget_high") {
          return (Number(b.adminBudget || b.price) || 0) - (Number(a.adminBudget || a.price) || 0);
        }
        if (sortOrder === "budget_low") {
          return (Number(a.adminBudget || a.price) || 0) - (Number(b.adminBudget || b.price) || 0);
        }
        return 0;
      });
  }, [projects, statusFilter, categoryFilter, searchQuery, sortOrder]);

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Technical Projects &amp; Services
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Submit project requests, track quote approvals, manage escrow payments, and review deliverables.
          </p>
        </div>

        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <Link href="/dashboard/user/technical/create">
            + New Service
          </Link>
        </Button>
      </div>

      {/* Top 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Active Services</p>
          <p className="text-3xl font-extrabold text-foreground mt-2">{stats.activeCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Pending Approval</p>
          <p className="text-3xl font-extrabold text-foreground mt-2">{stats.pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Completed Jobs</p>
          <p className="text-3xl font-extrabold text-foreground mt-2">{stats.completedCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Total Budget / Escrow</p>
          <p className="text-3xl font-extrabold text-foreground mt-2">
            ${stats.totalBudget.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: "all", label: "All Services" },
            { id: "active", label: "Active" },
            { id: "pending", label: "Pending" },
            { id: "completed", label: "Completed" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Search, Category Select & Sort */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl bg-card text-foreground text-xs font-medium focus:border-primary focus:outline-none transition-colors cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Software Development">Software Development</option>
            <option value="Web Design & UI/UX">Web Design & UI/UX</option>
            <option value="QA & Testing">QA & Testing</option>
            <option value="Troubleshooting">Troubleshooting</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          {/* Search Bar */}
          <div className="relative min-w-[220px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
              className="w-full pl-8 pr-3 py-2 border border-border rounded-xl bg-card text-foreground text-xs font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-xl bg-card text-foreground text-xs font-medium focus:border-primary focus:outline-none transition-colors cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="budget_high">Budget: High to Low</option>
            <option value="budget_low">Budget: Low to High</option>
          </select>
        </div>
      </div>

      {/* Main Content: Card Grid Design */}
      {loading ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-card p-12 text-center shadow-xs">
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Loading service projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
            <FolderOpen className="h-7 w-7" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">No services found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "Create and submit your first service project to get started."}
            </p>
          </div>
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-xs cursor-pointer"
          >
            <Link href="/dashboard/user/technical/create">
              + New Service
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const statusCfg = STATUS_CONFIG[project.submissionStatus] ?? STATUS_CONFIG.draft;
            const budget = project.adminBudget || project.price || 0;
            const isActioning = actionLoading === project.projectId;

            return (
              <div
                key={project.projectId}
                className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Status Badge & Category in one clean row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border whitespace-nowrap ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>

                    {project.category && (
                      <span className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap truncate max-w-[150px]">
                        {project.category}
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3
                    onClick={() => setViewProject(project)}
                    className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
                  >
                    {project.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  {/* Skills badges */}
                  {project.skills && project.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.skills.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary"
                        >
                          {s}
                        </span>
                      ))}
                      {project.skills.length > 3 && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          +{project.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Budget & Assigned Provider */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {project.submissionStatus === "approved" ? "Approved Budget" : "Budget"}
                      </p>
                      <p className="text-sm font-extrabold text-primary">
                        {project.currency || "USD"} ${Number(budget).toLocaleString()}
                      </p>
                    </div>

                    {project.assignedBusinessName && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Provider
                        </p>
                        <p className="text-xs font-semibold text-foreground truncate max-w-[120px]">
                          {project.assignedBusinessName}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Admin Approved Quote Breakdown on Card */}
                  {project.submissionStatus === "approved" && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-amber-600 font-bold text-[11px]">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Admin Quote Ready
                        </span>
                        <span>{project.commissionPercent || 10}% Commission</span>
                      </div>
                      {project.adminNotes && (
                        <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                          "{project.adminNotes}"
                        </p>
                      )}
                      <p className="text-[10px] text-amber-600 font-medium">
                        • Fund escrow to publish project live to businesses.
                      </p>
                    </div>
                  )}

                  {/* Deliverables Section if uploaded by Business */}
                  {((project.deliverableFiles && project.deliverableFiles.length > 0) ||
                    (project.deliverableUrls && project.deliverableUrls.length > 0)) && (
                    <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-primary" /> Deliverables Ready
                      </p>

                      {project.deliverableFiles && project.deliverableFiles.length > 0 && (
                        <div className="space-y-1">
                          {project.deliverableFiles.map((file, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs"
                            >
                              <span className="font-semibold text-foreground truncate text-xs">
                                {file.name}
                              </span>
                              <a
                                href={file.url}
                                download={file.name}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                              >
                                <Download className="h-3 w-3" /> Download
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer: Eye (Left) | Payment/Action (Middle) | Trash (Right) */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  {/* Left: View Project Details Eye Button */}
                  <button
                    type="button"
                    title="View Project Details"
                    onClick={() => setViewProject(project)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border transition-all cursor-pointer shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {/* Middle: Action / Payment Button */}
                  <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                    {(project.submissionStatus === "approved" || project.submissionStatus === "payment_pending") && (
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-xs"
                        onClick={() => setPayProject(project)}
                      >
                        <DollarSign className="mr-1 h-3.5 w-3.5" />
                        Pay Escrow (${(
                          Number(budget) +
                          (Number(budget) * (project.commissionPercent !== undefined ? project.commissionPercent : 10)) / 100
                        ).toLocaleString(undefined, { minimumFractionDigits: 2 })})
                      </Button>
                    )}

                    {(project.submissionStatus === "active" ||
                      project.submissionStatus === "in_progress" ||
                      project.submissionStatus === "accepted") && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 truncate"
                          onClick={() => setPayProject(project)}
                        >
                          <DollarSign className="mr-1 h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          View Payments
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setChatProject(project)}
                          className="rounded-xl text-xs font-semibold border-border hover:bg-muted shrink-0"
                        >
                          <MessageSquare className="mr-1 h-3.5 w-3.5 text-primary" /> Live Chat
                        </Button>
                      </>
                    )}

                    {project.submissionStatus === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmit(project)}
                        disabled={isActioning}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs"
                      >
                        {isActioning ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Submit for Review
                      </Button>
                    )}

                    {(project.submissionStatus === "submitted" || project.submissionStatus === "admin_review") && (
                      <span className="text-[11px] font-semibold text-muted-foreground text-center truncate">
                        Under Admin Review
                      </span>
                    )}

                    {project.submissionStatus === "completed" && (
                      <div className="flex items-center gap-1.5 w-full">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRevisionProject(project);
                            setRevisionReason("");
                          }}
                          disabled={isActioning}
                          className="flex-1 rounded-xl text-xs font-semibold text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" /> Revision
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(project.projectId)}
                          disabled={isActioning}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Accept &amp; Release
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Right: Delete Trash Icon Button */}
                  <button
                    type="button"
                    title="Delete Project"
                    disabled={isActioning}
                    onClick={() => handleDelete(project.projectId)}
                    className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isActioning ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW PROJECT DETAILS MODAL */}
      {viewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-primary font-bold">{viewProject.projectId}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      (STATUS_CONFIG[viewProject.submissionStatus] ?? STATUS_CONFIG.draft).color
                    }`}
                  >
                    {(STATUS_CONFIG[viewProject.submissionStatus] ?? STATUS_CONFIG.draft).icon}
                    {(STATUS_CONFIG[viewProject.submissionStatus] ?? STATUS_CONFIG.draft).label}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">{viewProject.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Category: <strong className="text-foreground">{viewProject.category}</strong>
                  {viewProject.subcategory && ` • ${viewProject.subcategory}`}
                  {viewProject.projectType && ` • ${viewProject.projectType}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewProject(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scope Summary & Description */}
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Project Scope &amp; Summary
              </p>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/40 p-3 border border-border">
                {viewProject.description || "No description provided."}
              </p>
            </div>

            {/* Tech Stack, Languages & Skills */}
            {((viewProject.preferredLanguages && viewProject.preferredLanguages.length > 0) ||
              (viewProject.skills && viewProject.skills.length > 0)) && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Required Tech Stack &amp; Skills
                </p>
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/40 p-3 border border-border">
                  {viewProject.preferredLanguages?.map((l) => (
                    <span
                      key={l}
                      className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400"
                    >
                      {l}
                    </span>
                  ))}
                  {viewProject.skills?.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Budget, Milestones & Timeline Grid */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl border border-border bg-muted/40 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Target Budget</span>
                <span className="text-sm font-extrabold text-primary">
                  {viewProject.currency || "USD"} ${Number(viewProject.adminBudget || viewProject.price || 0).toLocaleString()}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Payment Terms</span>
                <span className="font-semibold text-foreground">{viewProject.paymentTerms || "One-time"}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Timeline</span>
                <span className="font-semibold text-foreground">
                  {viewProject.startDate ? new Date(viewProject.startDate).toLocaleDateString() : "Flexible"}
                  {viewProject.endDate ? ` → ${new Date(viewProject.endDate).toLocaleDateString()}` : ""}
                </span>
              </div>
            </div>

            {/* Client Contact Info */}
            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Client Contact Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5 text-foreground">
                  <User className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{viewProject.clientName || "User"}</span>
                </div>
                {viewProject.clientEmail && (
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{viewProject.clientEmail}</span>
                  </div>
                )}
                {viewProject.clientPhone && (
                  <div className="flex items-center gap-1.5 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{viewProject.clientPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Review & Quote Details if Approved */}
            {(viewProject.submissionStatus === "approved" || viewProject.adminNotes || viewProject.requirements) && (
              <div className="rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/20 space-y-2 text-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Admin Quote &amp; Terms
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Approved Budget</span>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {viewProject.currency || "USD"} ${Number(viewProject.adminBudget || viewProject.price || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Commission</span>
                    <span className="font-semibold text-foreground">{viewProject.commissionPercent || 10}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Min Target</span>
                    <span className="font-semibold text-foreground">
                      {viewProject.currency || "USD"} ${Number(viewProject.minBudget || viewProject.adminBudget || viewProject.price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {viewProject.adminNotes && (
                  <p className="text-xs text-foreground bg-background/80 p-2.5 rounded-lg border border-amber-500/20">
                    <strong>Admin Note:</strong> {viewProject.adminNotes}
                  </p>
                )}
                {viewProject.requirements && (
                  <p className="text-xs text-foreground bg-background/80 p-2.5 rounded-lg border border-amber-500/20">
                    <strong>Admin Requirements:</strong> {viewProject.requirements}
                  </p>
                )}
                {viewProject.conditions && (
                  <p className="text-xs text-foreground bg-background/80 p-2.5 rounded-lg border border-amber-500/20">
                    <strong>Delivery Conditions:</strong> {viewProject.conditions}
                  </p>
                )}
              </div>
            )}

            {/* Submitted File Attachments */}
            {viewProject.attachmentFile && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Attached Scope &amp; Requirements File
                </p>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/40 shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">{viewProject.attachmentFile.name}</p>
                      {viewProject.attachmentFile.size && (
                        <p className="text-[10px] text-muted-foreground">
                          {(viewProject.attachmentFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={viewProject.attachmentFile.url}
                    download={viewProject.attachmentFile.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs hover:bg-primary/90 transition-all shrink-0 ml-3"
                  >
                    <Download className="h-3.5 w-3.5" /> Download File
                  </a>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewProject(null)}
                className="rounded-xl text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Escrow Payment Modal */}
      {payProject && (
        <PayProjectModal
          project={payProject}
          onClose={() => setPayProject(null)}
          onSuccess={() => {
            setPayProject(null);
            loadProjects();
          }}
        />
      )}

      {/* Real-time Project Chat Modal */}
      {chatProject && (
        <ProjectChatModal
          project={chatProject}
          onClose={() => setChatProject(null)}
        />
      )}

      {/* Revision Request Modal */}
      {revisionProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground">Request Deliverable Revision</h3>
            <p className="text-xs text-muted-foreground">
              Please specify the revisions or changes required by the provider for{" "}
              <span className="font-semibold text-foreground">{revisionProject.title}</span>.
            </p>
            <textarea
              rows={4}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="e.g. Please update the API response schema and add unit test coverage..."
              className="w-full p-3 border border-border rounded-xl bg-card text-foreground text-xs font-medium focus:border-primary focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRevisionProject(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRequestRevision}
                disabled={actionLoading === revisionProject.projectId}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs"
              >
                {actionLoading === revisionProject.projectId ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Send Revision Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
