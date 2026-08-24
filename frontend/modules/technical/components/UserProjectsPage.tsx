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
  Users,
  BadgeCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@/src/context/user.provider";
import {
  fetchMyProjects,
  readLocalProjects,
  writeLocalProjects,
  reviewAcceptProject,
  requestRevision,
  reviewMilestone,
  submitProject,
  deleteProject,
  fetchProjectProposals,
  deleteProjectProposal,
  assignProjectApplicant,
} from "../services/technical.services";
import { PayProjectModal } from "./PayProjectModal";
import { ProjectChatModal } from "./ProjectChatModal";
import { ProjectDeadlineCountdown } from "./ProjectDeadlineCountdown";

type SubmissionStatus =
  | "draft"
  | "pending"
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
  pending: {
    label: "Under Admin Review",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/60",
    icon: <Clock className="h-3.5 w-3.5 text-amber-500" />,
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
    label: "Active for Public",
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/60",
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
  assignedBusinessId?: string;
  assignedBusinessUserId?: string;
  assignedBusinessName?: string;
  assignedBusinessEmail?: string;
  assignedProposalId?: string;
  assignedAt?: string;
  completionNotes?: string;
  deliverableUrls?: string[];
  deliverableFiles?: { name: string; url: string; size?: number; type?: string; uploadedAt?: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  milestones?: any[];
  createdAt: string;
}

export default function UserProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters and UI Controls
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "in_progress" | "pending" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "budget_high" | "budget_low">("newest");

  // Modals
  const [viewProject, setViewProject] = useState<Project | null>(null);
  const [payProject, setPayProject] = useState<Project | null>(null);
  const [chatProject, setChatProject] = useState<Project | null>(null);
  const [appliedModalProject, setAppliedModalProject] = useState<Project | null>(null);
  const [selectedProposalDetail, setSelectedProposalDetail] = useState<any | null>(null);
  const [proposalsMap, setProposalsMap] = useState<Record<string, any[]>>({});
  const [revisionProject, setRevisionProject] = useState<Project | null>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [deleteModalProject, setDeleteModalProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Assigned provider review modal
  const [assignedViewProject, setAssignedViewProject] = useState<Project | null>(null);
  const [assignedReviewAction, setAssignedReviewAction] = useState<"revision" | "accept" | null>(null);
  const [assignedReviewNote, setAssignedReviewNote] = useState("");
  const [assignedReviewSubmitting, setAssignedReviewSubmitting] = useState(false);
  const [assignedMilestoneTab, setAssignedMilestoneTab] = useState(0);
  const ASSIGNED_NOTE_MAX = 150;

  const loadAllProposals = useCallback(async (list: Project[]) => {
    try {
      const pMap: Record<string, any[]> = {};
      await Promise.all(
        list.map(async (p) => {
          const id = p.projectId || String(p.id);
          const res = await fetchProjectProposals(id);
          const rawProposals = Array.isArray(res?.proposals) ? res.proposals : [];
          // Sort chronologically ascending (oldest on top)
          const sorted = [...rawProposals].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          pMap[id] = sorted;
          pMap[String(p.id)] = sorted;
          if (p.projectId) pMap[p.projectId] = sorted;
        })
      );
      setProposalsMap(pMap);
    } catch {}
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyProjects();
      const list = data?.projects || [];
      setProjects(list);
      loadAllProposals(list);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("platform_user_technical_projects", JSON.stringify(list));
        } catch {}
      }
    } catch {
      const local = readLocalProjects();
      setProjects(local);
      loadAllProposals(local);
    } finally {
      setLoading(false);
    }
  }, [loadAllProposals]);

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

  const handleConfirmDelete = async () => {
    if (!deleteModalProject) return;
    const targetId = deleteModalProject.projectId;
    setDeleting(true);
    // Optimistically remove from state immediately
    setProjects((prev) => prev.filter((p) => p.projectId !== targetId));
    setDeleteModalProject(null);
    try {
      await deleteProject(targetId);
      toast.success("Project and all related data deleted successfully.");
      await loadProjects();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete project");
      await loadProjects();
    } finally {
      setDeleting(false);
    }
  };

  const [deletingProposalId, setDeletingProposalId] = useState<string | null>(null);

  const handleDeleteApplicantProposal = async (project: Project, proposal: any) => {
    const propKey = String(proposal.proposalId || proposal.id || proposal.userId);
    setDeletingProposalId(propKey);

    const projectTargetId = project.projectId || String(project.id);
    const applicantUserId = proposal.userId || proposal.applicantUserId;

    try {
      await deleteProjectProposal(projectTargetId, propKey);

      // Remove from client storage for applicant if present
      if (typeof window !== "undefined" && applicantUserId) {
        try {
          const key = `business_applied_projects_${applicantUserId}`;
          const existing: string[] = JSON.parse(localStorage.getItem(key) || "[]");
          const filtered = existing.filter(
            (id) =>
              id !== project.projectId &&
              id !== String(project.id) &&
              id !== `PRJ-${project.id}`
          );
          localStorage.setItem(key, JSON.stringify(filtered));
        } catch {}
      }

      // Update local proposalsMap
      setProposalsMap((prev) => {
        const next = { ...prev };
        const keys = [project.projectId, String(project.id), projectTargetId].filter(Boolean) as string[];
        keys.forEach((k) => {
          if (next[k]) {
            next[k] = next[k].filter(
              (p: any) => String(p.proposalId || p.id || p.userId) !== propKey
            );
          }
        });
        return next;
      });

      // Dispatch global update event so any other tab/service view updates to fresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("applied_projects_updated"));
      }

      toast.success("Applicant proposal deleted successfully from database.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete applicant proposal");
    } finally {
      setDeletingProposalId(null);
    }
  };

  const [assigningApplicantId, setAssigningApplicantId] = useState<string | null>(null);

  const handleAssignApplicant = async (project: Project | null, applicant: any) => {
    if (!project || !applicant) return;
    const applicantUserId = String(applicant.userId || applicant.applicantUserId || applicant.id || "");
    const applicantName = applicant.fullName || applicant.userName || applicant.businessName || "Business Partner";
    const applicantEmail = applicant.email || applicant.userEmail || "";
    const bsnName = applicant.businessName || applicantName;

    setAssigningApplicantId(applicantUserId);
    try {
      await assignProjectApplicant(project.projectId || String(project.id), {
        businessId: applicant.businessId || applicantUserId,
        businessName: bsnName,
        businessUserId: applicantUserId,
        businessEmail: applicantEmail,
        proposalId: applicant.proposalId || applicant.id,
      });

      // Update state locally
      setProjects((prev) =>
        prev.map((p) =>
          p.projectId === project.projectId || String(p.id) === String(project.id)
            ? {
                ...p,
                assignedBusinessId: applicantUserId,
                assignedBusinessUserId: applicantUserId,
                assignedBusinessName: bsnName,
                assignedBusinessEmail: applicantEmail,
                assignedProposalId: applicant.proposalId || applicant.id,
                submissionStatus: "in_progress",
                status: "in_progress",
                assignedAt: new Date().toISOString(),
              }
            : p
        )
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("applied_projects_updated"));
        window.dispatchEvent(new Event("storage"));
      }

      toast.success(`Project successfully assigned to ${applicantName}!`);
      setSelectedProposalDetail(null);
      setAppliedModalProject(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to assign project to applicant");
    } finally {
      setAssigningApplicantId(null);
    }
  };

  const { user } = useUser();

  // Filter projects strictly belonging to the currently logged in user
  const userProjects = useMemo(() => {
    if (!user) return projects;
    const uid = String((user as any)?.id || (user as any)?.userId || (user as any)?.sub || "").toLowerCase();
    const email = String((user as any)?.email || "").toLowerCase();
    const name = String((user as any)?.name || (user as any)?.fullName || "").toLowerCase();

    return projects.filter((p: any) => {
      const pClientId = String(p.clientId || "").toLowerCase();
      const pCreatedBy = String(p.createdBy || "").toLowerCase();
      const pEmail = String(p.clientEmail || "").toLowerCase();
      const pName = String(p.clientName || "").toLowerCase();

      // If project has no owner tags at all (e.g. freshly created locally without ID), allow it
      if (!pClientId && !pCreatedBy && !pEmail && !pName) return true;

      return (
        (uid && (pClientId === uid || pCreatedBy === uid)) ||
        (email && (pEmail === email || pClientId === email || pCreatedBy === email)) ||
        (name && pName === name)
      );
    });
  }, [projects, user]);

  // Top metric stats calculation
  const stats = useMemo(() => {
    const inProgressCount = userProjects.filter(
      (p) =>
        p.submissionStatus === "in_progress" ||
        Boolean(p.assignedBusinessId || p.assignedBusinessName)
    ).length;
    const activeCount = userProjects.filter(
      (p) =>
        (p.submissionStatus === "active" || p.paymentStatus === "paid") &&
        p.submissionStatus !== "in_progress" &&
        !p.assignedBusinessId &&
        !p.assignedBusinessName
    ).length;
    const pendingCount = userProjects.filter((p) => {
      const isPaid =
        p.paymentStatus === "paid" ||
        p.paymentStatus === "released" ||
        p.submissionStatus === "active" ||
        p.submissionStatus === "in_progress" ||
        Boolean(p.assignedBusinessId || p.assignedBusinessName);
      if (isPaid) return false;
      return (
        p.submissionStatus === "submitted" ||
        p.submissionStatus === "pending" ||
        p.submissionStatus === "admin_review" ||
        p.submissionStatus === "approved" ||
        p.submissionStatus === "payment_pending" ||
        p.submissionStatus === "draft"
      );
    }).length;
    const completedCount = userProjects.filter(
      (p) => p.submissionStatus === "completed" || p.submissionStatus === "accepted"
    ).length;
    const totalBudget = userProjects.reduce((sum, p) => {
      const b = p.adminBudget || p.price || 0;
      return sum + Number(b);
    }, 0);

    return { activeCount, inProgressCount, pendingCount, completedCount, totalBudget };
  }, [userProjects]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return userProjects
      .filter((p) => {
        const isAssignedOrInProgress =
          p.submissionStatus === "in_progress" ||
          Boolean(p.assignedBusinessId || p.assignedBusinessName);

        const isPaid =
          p.paymentStatus === "paid" ||
          p.paymentStatus === "released" ||
          p.submissionStatus === "active" ||
          isAssignedOrInProgress;

        // Status filter
        if (statusFilter === "in_progress") {
          if (!isAssignedOrInProgress) return false;
        } else if (statusFilter === "active") {
          if ((!isPaid && p.submissionStatus !== "active") || isAssignedOrInProgress) return false;
        } else if (statusFilter === "pending") {
          // If already paid / active / in progress, it is NOT pending
          if (isPaid) return false;
          if (
            p.submissionStatus !== "submitted" &&
            p.submissionStatus !== "pending" &&
            p.submissionStatus !== "admin_review" &&
            p.submissionStatus !== "approved" &&
            p.submissionStatus !== "payment_pending" &&
            p.submissionStatus !== "draft"
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

      {/* Top 5 Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Active Services</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">{stats.activeCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">In Progress</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">{stats.inProgressCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Pending Approval</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">{stats.pendingCount}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Completed Jobs</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">{stats.completedCount}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40">
          <p className="text-xs font-semibold text-muted-foreground">Total Budget / Escrow</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-2">
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
            { id: "in_progress", label: "In Progress" },
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
            const isPaid =
              project.paymentStatus === "paid" ||
              project.paymentStatus === "released" ||
              ["active", "in_progress", "completed", "accepted"].includes(project.submissionStatus);

            return (
              <div
                key={project.projectId}
                className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Header Row 1: Project ID (Left) & Deadline Pill / Category Badge (Right) */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                      {project.projectId}
                    </span>

                    {/* Top Right: Countdown Pill when assigned, else Category badge */}
                    {project.submissionStatus === "in_progress" ||
                    project.assignedBusinessId ||
                    project.assignedBusinessName ? (
                      <ProjectDeadlineCountdown
                        endDate={project.endDate}
                        createdAt={project.createdAt}
                        assignedAt={project.assignedAt}
                      />
                    ) : (
                      project.category && (
                        <span className="rounded-lg bg-muted border border-border/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap shrink-0">
                          {project.category}
                        </span>
                      )
                    )}
                  </div>

                  {/* Header Row 2: Status Badge (Left) + Category Pill (Right) if assigned */}
                  <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border whitespace-nowrap ${statusCfg.color}`}
                    >
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>

                    {(project.submissionStatus === "in_progress" ||
                      project.assignedBusinessId ||
                      project.assignedBusinessName) &&
                      project.category && (
                        <span className="rounded-lg bg-muted border border-border/50 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap shrink-0 ml-auto">
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

                    {(project.assignedBusinessName || project.assignedBusinessEmail) && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                          Assigned To
                        </p>
                        <p className="text-xs font-bold text-foreground truncate max-w-[130px]">
                          {project.assignedBusinessName || "—"}
                        </p>
                        {project.assignedBusinessEmail && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                            {project.assignedBusinessEmail}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Admin Approved Quote Breakdown on Card (Only when approved and unpaid) */}
                  {(project.submissionStatus === "approved" || project.submissionStatus === "payment_pending") &&
                    project.paymentStatus !== "paid" && (
                      <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Admin Quote Ready
                          </span>
                          <span>
                            {project.commissionPercent !== undefined
                              ? Number(project.commissionPercent).toFixed(2)
                              : "10.00"}% Commission
                          </span>
                        </div>
                        {project.adminNotes && (
                          <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                            "{project.adminNotes}"
                          </p>
                        )}
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          • Fund escrow to publish project live to businesses.
                        </p>
                      </div>
                    )}

                  {/* Escrow Funded & Active Message once paid */}
                  {(project.submissionStatus === "active" || project.paymentStatus === "paid") &&
                    !project.assignedBusinessId &&
                    !project.assignedBusinessName && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Escrow Funded &amp; Active for Public
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Published live. Verified businesses can now apply and submit proposals.
                        </p>
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
                    {(project.submissionStatus === "approved" || project.submissionStatus === "payment_pending") &&
                      project.paymentStatus !== "paid" && (
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

                    {/* ASSIGNED PROJECT — ALWAYS SHOW 'VIEW SUBMISSION' BUTTON */}
                    {(Boolean(project.assignedBusinessId || project.assignedBusinessName || project.assignedBusinessUserId) ||
                      project.submissionStatus === "in_progress" ||
                      project.submissionStatus === "completed" ||
                      project.submissionStatus === "revision" ||
                      project.submissionStatus === "accepted") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssignedViewProject(project);
                          setAssignedMilestoneTab(0);
                          setAssignedReviewAction(null);
                          setAssignedReviewNote("");
                        }}
                        className="w-full rounded-xl text-xs font-bold border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Submission</span>
                      </Button>
                    )}

                    {/* UNASSIGNED ACTIVE PROJECT — SHOW APPLIED PROPOSALS BUTTON */}
                    {!project.assignedBusinessId &&
                      !project.assignedBusinessName &&
                      !project.assignedBusinessUserId &&
                      (project.submissionStatus === "active" || project.paymentStatus === "paid") && (
                        <div className="flex items-center justify-end w-full gap-2">
                          {(() => {
                            const pKey = project.projectId || String(project.id);
                            const proposals = proposalsMap[pKey] || proposalsMap[String(project.id)] || [];
                            const count = proposals.length;

                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAppliedModalProject(project)}
                                className="w-full rounded-xl text-xs font-bold border-border hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Users className="h-3.5 w-3.5 text-primary" />
                                <span>Applied</span>
                                {count > 0 && (
                                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold text-white min-w-[18px] shadow-xs">
                                    {count}
                                  </span>
                                )}
                              </Button>
                            );
                          })()}
                        </div>
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
                  </div>

                  {/* Right: Delete Trash Icon Button */}
                  {isPaid ? (
                    <button
                      type="button"
                      disabled
                      title="Funded and active projects cannot be deleted"
                      className="p-2 rounded-xl text-muted-foreground/30 border border-border/40 cursor-not-allowed shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Delete Project"
                      disabled={isActioning || deleting}
                      onClick={() => setDeleteModalProject(project)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 border border-border transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW PROJECT DETAILS MODAL */}
      {viewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div
            style={{ maxWidth: "560px", width: "100%" }}
            className="w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-auto"
          >
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span>{viewProject.clientName || "User"}</span>
                </div>
                {viewProject.clientEmail && (
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span>{viewProject.clientEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Review & Quote Details if Approved or Active */}
            {(viewProject.submissionStatus === "approved" ||
              viewProject.submissionStatus === "active" ||
              viewProject.submissionStatus === "in_progress" ||
              viewProject.submissionStatus === "completed" ||
              viewProject.submissionStatus === "accepted" ||
              viewProject.adminNotes ||
              viewProject.requirements) && (() => {
                const isPaid =
                  viewProject.paymentStatus === "paid" ||
                  viewProject.paymentStatus === "released" ||
                  ["active", "in_progress", "completed", "accepted"].includes(viewProject.submissionStatus);

                return (
                  <div
                    className={`rounded-xl p-3.5 border space-y-2 text-xs transition-all ${
                      isPaid
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-950 dark:text-amber-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        {isPaid ? "Escrow Funded & Agreed Terms" : "Admin Quote & Terms"}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          isPaid
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {isPaid ? "Active for Public" : "Pending Escrow Payment"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                          {isPaid ? "Funded Escrow Budget" : "Approved Budget"}
                        </span>
                        <span
                          className={`text-sm font-extrabold ${
                            isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {viewProject.currency || "USD"} ${Number(viewProject.adminBudget || viewProject.price || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Commission</span>
                        <span className="font-semibold text-foreground">{viewProject.commissionPercent || 10}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Payment Status</span>
                        <span
                          className={`font-semibold capitalize ${
                            isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isPaid ? "Paid in Escrow" : "Unpaid"}
                        </span>
                      </div>
                    </div>

                    {viewProject.adminNotes && (
                      <p
                        className={`text-xs p-2.5 rounded-lg border bg-background/80 ${
                          isPaid ? "border-emerald-500/20" : "border-amber-500/20"
                        }`}
                      >
                        <strong>Admin Note:</strong> {viewProject.adminNotes}
                      </p>
                    )}
                    {viewProject.requirements && (
                      <p
                        className={`text-xs p-2.5 rounded-lg border bg-background/80 ${
                          isPaid ? "border-emerald-500/20" : "border-amber-500/20"
                        }`}
                      >
                        <strong>Admin Requirements:</strong> {viewProject.requirements}
                      </p>
                    )}
                    {viewProject.conditions && (
                      <p
                        className={`text-xs p-2.5 rounded-lg border bg-background/80 ${
                          isPaid ? "border-emerald-500/20" : "border-amber-500/20"
                        }`}
                      >
                        <strong>Delivery Conditions:</strong> {viewProject.conditions}
                      </p>
                    )}
                  </div>
                );
              })()}

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

      {/* APPLIED APPLICANTS MODAL */}
      {appliedModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-hidden">
          <div
            style={{ maxWidth: "980px", width: "100%" }}
            className="relative w-full rounded-2xl bg-card shadow-2xl border border-border flex flex-col h-[520px] max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
          >
            {/* Fixed Header (Does not scroll) */}
            <div className="flex items-start justify-between border-b border-border px-6 py-4 bg-card shrink-0">
              <div className="space-y-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-2 py-0.5 rounded-md inline-block">
                    {appliedModalProject.projectId}
                  </span>
                  {appliedModalProject.assignedBusinessName || appliedModalProject.assignedBusinessId ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Assigned to: {appliedModalProject.assignedBusinessName || "Assigned Business Partner"}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Applied Business Applicants
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                  {appliedModalProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAppliedModalProject(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 transition-all">
              {(() => {
                const pKey = appliedModalProject.projectId || String(appliedModalProject.id);
                const list = proposalsMap[pKey] || proposalsMap[String(appliedModalProject.id)] || [];

                return (
                  <table className="w-full text-left border-collapse min-w-[780px]">
                    <thead className="bg-muted/80 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                      <tr>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Full Name
                        </th>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Business Name
                        </th>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Business Type
                        </th>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Account
                        </th>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                          Message
                        </th>
                        <th className="px-4 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider text-right">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {list.length > 0 ? (
                        list.map((prop: any, idx: number) => {
                          const uId = String(prop.userId || prop.applicantUserId || prop.id || prop.businessId || "");
                          const bsnId = prop.businessId || `BSN-${String(idx + 1).padStart(2, "0")}`;
                          const fullName = prop.fullName || prop.userName || "";
                          const bsnName = prop.businessName || "";

                          // Resolve business type from direct props, nested business info, and profile overrides
                          let bsnType =
                            prop.businessType ||
                            prop.businessIndustry ||
                            prop.businessCategory ||
                            prop.businessInfo?.businessType ||
                            prop.businessInfo?.businessIndustry ||
                            "";

                          if (!bsnType || bsnType === "Software Development & IT") {
                            if (typeof window !== "undefined" && uId) {
                              try {
                                const rawOverride = localStorage.getItem(`profile_override_${uId}`);
                                if (rawOverride) {
                                  const pData = JSON.parse(rawOverride);
                                  const candidate = pData.businessType || pData.businessIndustry || pData.businessCategory;
                                  if (candidate) bsnType = candidate;
                                }
                                if (!bsnType || bsnType === "Software Development & IT") {
                                  const allOverrides = JSON.parse(localStorage.getItem("global_profile_overrides") || "{}");
                                  if (allOverrides[uId]?.businessType) {
                                    bsnType = allOverrides[uId].businessType;
                                  }
                                }
                                if (!bsnType || bsnType === "Software Development & IT") {
                                  const allContacts = JSON.parse(localStorage.getItem("platform_registered_contacts") || "[]");
                                  const match = allContacts.find((c: any) => c.id === uId || (c.name && c.name === fullName));
                                  if (match?.businessType) {
                                    bsnType = match.businessType;
                                  }
                                }
                              } catch {}
                            }
                          }

                          if (!bsnType || bsnType === "Software Development & IT") {
                            bsnType = "Technology";
                          }

                          return (
                            <tr key={prop.id || prop.proposalId || idx} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3.5 font-mono text-xs font-bold text-primary">
                                {bsnId}
                              </td>
                              <td className="px-4 py-3.5 text-xs font-bold text-foreground">
                                {fullName}
                              </td>
                              <td className="px-4 py-3.5 text-xs font-semibold text-foreground">
                                {bsnName}
                              </td>
                              <td className="px-4 py-3.5 text-xs font-medium text-foreground">
                                {bsnType || "—"}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  Verified
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const p = appliedModalProject;
                                    setAppliedModalProject(null);
                                    const applicantId = prop.userId || prop.applicantUserId || prop.id || "applicant";
                                    const threadId = `TH-${p?.projectId || p?.id || "PRJ"}-${applicantId}`;
                                    const targetName = fullName || bsnName || "Business Partner";
                                    const targetBsn = bsnName || "";
                                    const targetEmail = prop.email || prop.userEmail || (fullName ? `${fullName.toLowerCase().replace(/\s+/g, ".")}@business.com` : "applicant@business.com");
                                    const prjTitle = p?.title || "";
                                    const prjId = String(p?.projectId || p?.id || "");

                                    router.push(
                                      `/dashboard/user/messages?thread=${encodeURIComponent(threadId)}&toName=${encodeURIComponent(targetName)}&toBsn=${encodeURIComponent(targetBsn)}&toEmail=${encodeURIComponent(targetEmail)}&toUserId=${encodeURIComponent(applicantId)}&projectId=${encodeURIComponent(prjId)}&projectTitle=${encodeURIComponent(prjTitle)}`
                                    );
                                  }}
                                  className="h-7 text-xs px-2.5 rounded-lg border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 cursor-pointer flex items-center gap-1.5"
                                >
                                  <MessageSquare className="h-3 w-3 text-primary" /> Send Message
                                </Button>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    title="View Proposal Details"
                                    onClick={() => setSelectedProposalDetail({ ...prop, projectTitle: appliedModalProject.title })}
                                    className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-primary transition-all cursor-pointer inline-flex items-center justify-center"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  <button
                                    type="button"
                                    title="Delete Applicant Application"
                                    disabled={deletingProposalId === String(prop.proposalId || prop.id || prop.userId)}
                                    onClick={() => handleDeleteApplicantProposal(appliedModalProject, prop)}
                                    className="p-1.5 rounded-lg border border-border hover:bg-rose-500/10 hover:border-rose-500/30 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                                  >
                                    {deletingProposalId === String(prop.proposalId || prop.id || prop.userId) ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-rose-500" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 border border-border">
                              <Users className="w-6 h-6 text-muted-foreground/60" />
                            </div>
                            <p className="text-sm font-bold text-foreground">No applications submitted yet</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                              When verified business service providers apply for this project, their applications and proposal details will appear here in chronological order.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* PROPOSAL DETAIL MODAL */}
      {selectedProposalDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-hidden">
          <div
            style={{ maxWidth: "560px", width: "100%" }}
            className="relative w-full rounded-2xl bg-card shadow-2xl border border-border flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
          >
            <div className="flex items-start justify-between border-b border-border px-6 py-4 bg-card shrink-0">
              <div className="space-y-1">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md inline-block">
                  {selectedProposalDetail.businessId || "BSN-01"}
                </span>
                <h3 className="text-base font-bold text-foreground">Application Proposal Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProposalDetail(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3.5 border border-border text-xs">
                <div>
                  <p className="text-muted-foreground font-medium text-[11px]">Applicant Full Name</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedProposalDetail.fullName || selectedProposalDetail.userName || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium text-[11px]">Business / Company</p>
                  <p className="font-bold text-foreground mt-0.5">{selectedProposalDetail.businessName || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium text-[11px]">Business Type / Category</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {(() => {
                      const uId = String(selectedProposalDetail.userId || selectedProposalDetail.applicantUserId || selectedProposalDetail.id || "");
                      let t = selectedProposalDetail.businessType || selectedProposalDetail.businessIndustry || selectedProposalDetail.businessCategory || selectedProposalDetail.category || "";
                      if (!t && typeof window !== "undefined" && uId) {
                        try {
                          const raw = localStorage.getItem(`profile_override_${uId}`);
                          if (raw) t = JSON.parse(raw)?.businessType || JSON.parse(raw)?.businessIndustry || "";
                          if (!t) {
                            const allOverrides = JSON.parse(localStorage.getItem("global_profile_overrides") || "{}");
                            if (allOverrides[uId]?.businessType) t = allOverrides[uId].businessType;
                          }
                        } catch {}
                      }
                      return t || appliedModalProject?.category || "Software Development & IT";
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium text-[11px]">Verification Status</p>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 inline-flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Business
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-foreground mb-1.5">Application Message / Proposal</p>
                <div className="rounded-xl border border-border bg-card p-3.5 text-xs text-muted-foreground leading-relaxed">
                  {selectedProposalDetail.proposalMessage || selectedProposalDetail.proposal || "Ready to execute the deliverables according to project specifications."}
                </div>
              </div>

              {selectedProposalDetail.createdAt && (
                <p className="text-[11px] text-muted-foreground text-right">
                  Applied on: {new Date(selectedProposalDetail.createdAt).toLocaleString()}
                </p>
              )}
            </div>

            <div className="border-t border-border px-6 py-3 bg-muted/20 flex flex-wrap items-center justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedProposalDetail(null)}
                className="rounded-xl text-xs cursor-pointer"
              >
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const targetName = selectedProposalDetail.fullName || selectedProposalDetail.userName || selectedProposalDetail.businessName || "Business Partner";
                  const targetBsn = selectedProposalDetail.businessName || "";
                  const targetEmail = selectedProposalDetail.email || (targetName ? `${targetName.toLowerCase().replace(/\s+/g, ".")}@business.com` : "applicant@business.com");
                  const applicantId = selectedProposalDetail.userId || selectedProposalDetail.applicantUserId || selectedProposalDetail.id || "applicant";
                  const p = appliedModalProject;
                  const prjTitle = p?.title || "";
                  const prjId = String(p?.projectId || p?.id || "");
                  const threadId = `TH-${prjId || "PRJ"}-${applicantId}`;

                  setSelectedProposalDetail(null);
                  setAppliedModalProject(null);

                  router.push(
                    `/dashboard/user/messages?thread=${encodeURIComponent(threadId)}&toName=${encodeURIComponent(targetName)}&toBsn=${encodeURIComponent(targetBsn)}&toEmail=${encodeURIComponent(targetEmail)}&toUserId=${encodeURIComponent(applicantId)}&projectId=${encodeURIComponent(prjId)}&projectTitle=${encodeURIComponent(prjTitle)}`
                  );
                }}
                className="border-primary/30 text-primary hover:bg-primary/10 font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Send Message
              </Button>

              {/* ASSIGN PROJECT BUTTON */}
              <Button
                size="sm"
                disabled={
                  Boolean(assigningApplicantId) ||
                  appliedModalProject?.assignedBusinessId === (selectedProposalDetail.userId || selectedProposalDetail.businessId) ||
                  appliedModalProject?.assignedBusinessUserId === (selectedProposalDetail.userId || selectedProposalDetail.businessId)
                }
                onClick={() => handleAssignApplicant(appliedModalProject, selectedProposalDetail)}
                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {assigningApplicantId === String(selectedProposalDetail.userId || selectedProposalDetail.applicantUserId || selectedProposalDetail.businessId || selectedProposalDetail.id) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                {appliedModalProject?.assignedBusinessId === (selectedProposalDetail.userId || selectedProposalDetail.businessId) ||
                appliedModalProject?.assignedBusinessUserId === (selectedProposalDetail.userId || selectedProposalDetail.businessId)
                  ? "Assigned"
                  : "Assign Project"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNED PROVIDER & DELIVERABLE REVIEW MODAL */}
      {assignedViewProject && (() => {
        const p = assignedViewProject;
        const milestoneCount = (() => {
          const t = (p.paymentTerms || "").toLowerCase();
          if (t.includes("three")) return 3;
          if (t.includes("two")) return 2;
          return 1;
        })();
        const milestoneLabels = ["First Time Payment", "Second Time Payment", "Third Time Payment"];
        const getMLabel = (i: number) =>
          milestoneCount === 1 ? "One Time Payment / Milestone" : (milestoneLabels[i] ?? `Milestone ${i + 1}`);

        // milestones JSONB array from DB for per-milestone status
        const dbMilestones: any[] = Array.isArray(p.milestones) ? p.milestones : [];
        const getMilestoneStatus = (i: number) => dbMilestones[i]?.status ?? "pending";
        const getMilestoneClientNote = (i: number) => dbMilestones[i]?.clientNote ?? "";

        const currentMsStatus = getMilestoneStatus(assignedMilestoneTab);
        const currentAccepted = currentMsStatus === "accepted";

        // Tab unlock: tab 0 always open, tab N open if previous accepted
        const isTabOpen = (i: number) => i === 0 || getMilestoneStatus(i - 1) === "accepted";

        const allFiles = p.deliverableFiles || [];
        const allLinks = (p.deliverableUrls || []).filter(u => !allFiles.find(f => f.url === u));
        const notesText = p.completionNotes || "";
        const hasDeliverables = allFiles.length > 0 || allLinks.length > 0 || notesText;

        const canSubmitReview = assignedReviewAction !== null && assignedReviewNote.trim().length > 0;

        const handleReviewSubmit = async () => {
          if (!canSubmitReview) return;
          setAssignedReviewSubmitting(true);
          try {
            await reviewMilestone(p.projectId, {
              milestoneIndex: assignedMilestoneTab,
              action: assignedReviewAction as "accept" | "revision",
              clientNote: assignedReviewNote.trim(),
              totalMilestones: milestoneCount,
            });

            if (assignedReviewAction === "accept") {
              const isLast = assignedMilestoneTab === milestoneCount - 1;
              if (isLast || milestoneCount === 1) {
                toast.success("Project accepted! Escrow payment released to the provider.");
              } else {
                toast.success(`Milestone ${assignedMilestoneTab + 1} accepted! Next milestone is now unlocked.`);
                setAssignedMilestoneTab(assignedMilestoneTab + 1);
              }
            } else {
              toast.success(`Revision requested on Milestone ${assignedMilestoneTab + 1}. Provider has been notified.`);
            }

            setAssignedReviewAction(null);
            setAssignedReviewNote("");
            loadProjects();
          } catch (e: any) {
            toast.error(e?.message || "Action failed. Please try again.");
          } finally {
            setAssignedReviewSubmitting(false);
          }
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div
              style={{ maxWidth: "560px", width: "100%", maxHeight: "90vh" }}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl my-auto"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border px-5 py-4 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-primary font-bold">{p.projectId}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${STATUS_CONFIG[p.submissionStatus]?.color ?? ""}`}>
                      {STATUS_CONFIG[p.submissionStatus]?.icon}
                      {STATUS_CONFIG[p.submissionStatus]?.label}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1 leading-tight">{p.title}</h3>
                  {p.paymentTerms && (
                    <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 rounded-md px-2 py-0.5">
                      {p.paymentTerms}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAssignedViewProject(null)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 ml-3 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Milestone Tabs */}
              {milestoneCount > 1 && (
                <div className="flex gap-0.5 px-5 pt-3 shrink-0 border-b border-border pb-0">
                  {Array.from({ length: milestoneCount }, (_, i) => {
                    const open = isTabOpen(i);
                    const msStatus = getMilestoneStatus(i);
                    const isActive = assignedMilestoneTab === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!open}
                        onClick={() => { if (open) { setAssignedMilestoneTab(i); setAssignedReviewAction(null); setAssignedReviewNote(""); } }}
                        className={[
                          "flex-1 flex items-center justify-center gap-1.5 rounded-t-xl border-b-2 px-3 py-2.5 text-[11px] font-bold transition-all whitespace-nowrap",
                          isActive ? "border-primary text-primary bg-primary/5 cursor-pointer"
                            : open ? "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                            : "border-transparent text-muted-foreground/40 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {msStatus === "accepted" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        ) : msStatus === "revision" ? (
                          <RotateCcw className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        ) : open ? (
                          <Eye className="h-3 w-3 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                        )}
                        {getMLabel(i)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Provider Info Card */}
                <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground leading-tight">
                            {p.assignedBusinessName || "Assigned Business Provider"}
                          </p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <BadgeCheck className="w-3 h-3 text-emerald-500" />
                            Verified Business
                          </span>
                        </div>
                        {p.assignedBusinessEmail && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Mail className="h-3 w-3 text-primary/80" /> {p.assignedBusinessEmail}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setChatProject(p); setAssignedViewProject(null); }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-card px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Send Message
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-border/60">
                    <div className="rounded-xl border border-border bg-background/70 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Business ID</span>
                      <span className="font-mono text-primary font-bold truncate block mt-0.5">{p.assignedBusinessId || "BSN-01"}</span>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Category / Type</span>
                      <span className="font-semibold text-foreground truncate block mt-0.5">{p.category || "Software Development"}</span>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 p-2.5 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Assigned Date</span>
                      <span className="font-semibold text-foreground block mt-0.5">
                        {p.assignedAt ? new Date(p.assignedAt).toLocaleDateString() : "Active Project"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACCEPTED stamp for this milestone */}
                {currentAccepted && (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        {getMLabel(assignedMilestoneTab)} — Accepted ✓
                      </p>
                      {getMilestoneClientNote(assignedMilestoneTab) && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          Your note: "{getMilestoneClientNote(assignedMilestoneTab)}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* REVISION status for this milestone */}
                {currentMsStatus === "revision" && (
                  <div className="flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 shadow-xs">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 shrink-0">
                      <RotateCcw className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        Revision Requested — Waiting for provider to resubmit
                      </p>
                      {getMilestoneClientNote(assignedMilestoneTab) && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          Your note: "{getMilestoneClientNote(assignedMilestoneTab)}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Deliverables Section */}
                {hasDeliverables ? (
                  <div className="space-y-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {currentMsStatus === "revision" ? "Previous Submission (Revision Requested)" : "Submitted Deliverables by Provider"}
                    </p>

                    {/* Numbered Attached Files with Download Button */}
                    {allFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground flex items-center justify-between">
                          <span>Attached Files ({allFiles.length})</span>
                        </p>
                        <div className="space-y-2">
                          {allFiles.map((file, i) => (
                            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-xs shadow-xs hover:border-primary/40 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[11px] shrink-0">
                                  {i + 1}
                                </span>
                                <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground truncate">{file.name}</p>
                                  {file.size && <p className="text-[11px] text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>}
                                </div>
                              </div>
                              <a
                                href={file.url}
                                download={file.name}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg shadow-xs transition-all shrink-0 ml-3 cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" /> Download
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submitted Links */}
                    {allLinks.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground">Submitted Links ({allLinks.length})</p>
                        <div className="space-y-1.5">
                          {allLinks.map((link, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-xs shadow-xs">
                              <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                              <a href={link} target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline truncate">
                                {link}
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Provider Notes */}
                    {notesText && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-foreground">Provider Notes</p>
                        <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                          {notesText}
                        </div>
                      </div>
                    )}
                  </div>
                ) : !currentAccepted && currentMsStatus !== "revision" && (
                  <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="font-bold text-foreground text-sm">No deliverables submitted yet</p>
                    <p className="mt-1">The business provider is currently working on this milestone.</p>
                  </div>
                )}

                {/* Review / Accept Decision Section — Toggle buttons and Note box */}
                {(p.submissionStatus === "completed" || hasDeliverables) && !currentAccepted && currentMsStatus !== "revision" && (
                  <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3.5 shadow-xs">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Your Decision</p>

                    {/* Toggle Buttons in Theme Blue Style */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => { setAssignedReviewAction("revision"); setAssignedReviewNote(""); }}
                        className={[
                          "rounded-xl py-3 text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs",
                          assignedReviewAction === "revision"
                            ? "bg-primary text-primary-foreground border-primary font-extrabold ring-2 ring-primary/30"
                            : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Request Revision
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAssignedReviewAction("accept"); setAssignedReviewNote(""); }}
                        className={[
                          "rounded-xl py-3 text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs",
                          assignedReviewAction === "accept"
                            ? "bg-primary text-primary-foreground border-primary font-extrabold ring-2 ring-primary/30"
                            : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Accept {milestoneCount > 1 ? `Milestone ${assignedMilestoneTab + 1}` : "& Release Payment"}
                      </button>
                    </div>

                    {/* Review Note Box (revealed when toggled) */}
                    {assignedReviewAction && (
                      <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {assignedReviewAction === "accept"
                              ? (milestoneCount === 1 ? "Acceptance Note" : `Milestone ${assignedMilestoneTab + 1} Acceptance Note`)
                              : "Revision Reason"}
                            <span className="text-red-500 ml-0.5">*</span>
                          </label>
                          <span className={`text-[11px] font-semibold ${assignedReviewNote.length >= ASSIGNED_NOTE_MAX ? "text-red-500" : "text-muted-foreground"}`}>
                            {assignedReviewNote.length}/{ASSIGNED_NOTE_MAX}
                          </span>
                        </div>
                        <textarea
                          value={assignedReviewNote}
                          onChange={(e) => { if (e.target.value.length <= ASSIGNED_NOTE_MAX) setAssignedReviewNote(e.target.value); }}
                          placeholder={assignedReviewAction === "accept"
                            ? "Confirm the work meets requirements. Add any handover comments or final acceptance notes..."
                            : "Describe exactly what needs to be revised or corrected by the provider..."
                          }
                          rows={3}
                          className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none shadow-inner"
                        />
                        {assignedReviewNote.trim().length === 0 && (
                          <p className="text-[11px] text-amber-500">Note is required before submitting decision.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-5 py-3.5 bg-muted/20 shrink-0 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignedViewProject(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
                >
                  Close
                </button>
                {(p.submissionStatus === "completed" || hasDeliverables) && !currentAccepted && currentMsStatus !== "revision" && (
                  <button
                    type="button"
                    disabled={!canSubmitReview || assignedReviewSubmitting}
                    onClick={handleReviewSubmit}
                    className="rounded-xl px-5 py-2 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm bg-primary hover:bg-primary/90 text-white"
                  >
                    {assignedReviewSubmitting ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...</>
                    ) : assignedReviewAction === "accept" ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Accept & Release {milestoneCount > 1 ? `Milestone ${assignedMilestoneTab + 1}` : "Payment"}</>
                    ) : (
                      <><RotateCcw className="h-3.5 w-3.5" /> Submit Revision Request</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteModalProject && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
          <div
            style={{ width: "380px", maxWidth: "calc(100vw - 32px)" }}
            className="rounded-2xl bg-card border border-border text-card-foreground shadow-2xl p-6 text-center mx-auto my-auto animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" strokeWidth={1.8} />
            </div>

            <h3 className="text-lg font-bold text-foreground mb-1">Delete Project</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-5">
              Are you sure you want to delete <strong className="text-foreground">"{deleteModalProject.title}"</strong>? All submitted requirements, files, and project records will be permanently deleted from the database.
            </p>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteModalProject(null)}
                className="flex-1 rounded-xl border-border text-foreground hover:bg-muted py-2.5 text-xs font-semibold cursor-pointer"
              >
                No, Cancel
              </Button>
              <Button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
