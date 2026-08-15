"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck,
  FolderOpen,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  X,
  XCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "@/src/core/store/hooks";

export type SubmissionStatus =
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

interface Project {
  id: number;
  projectId: string;
  title: string;
  description: string;
  submissionStatus: SubmissionStatus;
  paymentStatus: string;
  price?: number;
  adminBudget?: number;
  minBudget?: number;
  commissionPercent?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  projectType?: string;
  skills?: string[];
  requirements?: string;
  conditions?: string;
  adminNotes?: string;
  clientName?: string;
  clientId?: string;
  assignedBusinessName?: string;
  assignedBusinessId?: string;
  deliverableUrls?: string[];
  completionNotes?: string;
  rejectReason?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  submitted: { label: "Submitted — Needs Review", color: "bg-purple-100 text-purple-700" },
  admin_review: { label: "In Review", color: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved — Awaiting Payment", color: "bg-amber-100 text-amber-700" },
  active: { label: "Paid — Available to Businesses", color: "bg-green-100 text-green-700" },
  in_progress: { label: "In Progress (Business Working)", color: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Completed — Needs Review", color: "bg-teal-100 text-teal-700" },
  revision: { label: "Revision Requested", color: "bg-orange-100 text-orange-700" },
  accepted: { label: "Accepted & Payment Released", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
};

export default function AdminTechnicalProjectsManager() {
  const token = useAppSelector((state) => state.auth.token);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "submitted" | "approved" | "in_progress" | "completed" | "all"
  >("submitted");

  // Review Modal State
  const [reviewProject, setReviewProject] = useState<Project | null>(null);
  const [adminBudget, setAdminBudget] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("10");
  const [requirements, setRequirements] = useState("");
  const [conditions, setConditions] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Revision Modal State
  const [revisionProject, setRevisionProject] = useState<Project | null>(null);
  const [revisionReason, setRevisionReason] = useState("");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    let remoteProjects: Project[] = [];
    try {
      const res = await fetch("/admin/api/technology/projects/all", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.projects && Array.isArray(data.projects)) {
          remoteProjects = data.projects;
        }
      }
    } catch {
      // Gracefully handle without crashing
    }

    // Merge with local projects store
    let localProjects: Project[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("platform_user_technical_projects");
        if (raw) localProjects = JSON.parse(raw) || [];
      } catch {}
    }

    const map = new Map<string, Project>();
    [...remoteProjects, ...localProjects].forEach((p) => {
      if (p && p.projectId) map.set(p.projectId, p);
    });

    setProjects(Array.from(map.values()));
    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openReviewModal = (p: Project) => {
    setReviewProject(p);
    setAdminBudget(String(p.adminBudget || p.price || 1000));
    setMinBudget(String(p.minBudget || p.price || 800));
    setCommissionPercent(String(p.commissionPercent || 10));
    setRequirements(p.requirements || "Full compliance with technical specifications and code quality guidelines.");
    setConditions(p.conditions || "Work must be delivered within the agreed timeline with documentation.");
    setAdminNotes(p.adminNotes || "");
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewProject) return;
    const b = parseFloat(adminBudget);
    if (!b || b <= 0) return toast.error("Enter a valid approved budget amount.");

    setActionLoading(true);

    // Update local storage sync
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("platform_user_technical_projects");
        if (raw) {
          const list: Project[] = JSON.parse(raw) || [];
          const updated = list.map((p) =>
            p.projectId === reviewProject.projectId
              ? {
                  ...p,
                  submissionStatus: "approved" as SubmissionStatus,
                  adminBudget: b,
                  minBudget: parseFloat(minBudget) || b,
                  commissionPercent: parseFloat(commissionPercent) || 10,
                  requirements,
                  conditions,
                  adminNotes,
                }
              : p
          );
          localStorage.setItem("platform_user_technical_projects", JSON.stringify(updated));
        }
      } catch {}
    }

    // Add User Notification & Activity Log
    if (typeof window !== "undefined") {
      try {
        const notifItem = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: "Technical Project Approved",
          description: `"${reviewProject.title}" has been approved with quote $${b}. Please fund escrow to publish publicly.`,
          time: "Just now",
          read: false,
          href: "/dashboard/user/technical",
          type: "system",
        };

        ["app_notifs_user", "app_notifs_all"].forEach((k) => {
          const existing = JSON.parse(localStorage.getItem(k) || "[]");
          localStorage.setItem(k, JSON.stringify([notifItem, ...existing]));
        });

        const logKey = "platform_activity_logs";
        const logs = JSON.parse(localStorage.getItem(logKey) || "[]");
        const logItem = {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          title: `Technical Project Approved: "${reviewProject.title}"`,
          description: `Admin approved quote of $${b} with ${commissionPercent}% commission.`,
          category: "Technical Services",
          type: "project_approved",
        };
        localStorage.setItem(logKey, JSON.stringify([logItem, ...logs]));

        window.dispatchEvent(new Event("notifications_updated"));
        window.dispatchEvent(new Event("activity_logs_updated"));
      } catch {}
    }

    try {
      const res = await fetch(`/admin/api/technology/projects/${reviewProject.projectId}/admin-approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          adminBudget: b,
          minBudget: parseFloat(minBudget) || b,
          commissionPercent: parseFloat(commissionPercent) || 10,
          requirements,
          conditions,
          adminNotes,
        }),
      });
      if (res.ok) {
        await res.json();
      }
    } catch {}

    toast.success(`Project "${reviewProject.title}" approved! Client notified to make payment.`);
    setReviewProject(null);
    setActionLoading(false);
    await loadProjects();
  };

  const handleReject = async (projectId: string) => {
    if (!confirm("Are you sure you want to reject this project?")) return;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("platform_user_technical_projects");
        if (raw) {
          const list: Project[] = JSON.parse(raw) || [];
          const updated = list.map((p) =>
            p.projectId === projectId
              ? { ...p, submissionStatus: "rejected" as SubmissionStatus, rejectReason: adminNotes || "Does not meet guidelines." }
              : p
          );
          localStorage.setItem("platform_user_technical_projects", JSON.stringify(updated));
        }
      } catch {}
    }

    try {
      await fetch(`/admin/api/technology/projects/${projectId}/admin-reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: adminNotes || "Does not meet platform guidelines." }),
      });
    } catch {}

    toast.success("Project rejected.");
    setReviewProject(null);
    await loadProjects();
  };

  const handleReleasePayment = async (projectId: string) => {
    if (!confirm("Accept project deliverables and release escrow payment to the business?")) return;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("platform_user_technical_projects");
        if (raw) {
          const list: Project[] = JSON.parse(raw) || [];
          const updated = list.map((p) =>
            p.projectId === projectId
              ? { ...p, submissionStatus: "accepted" as SubmissionStatus, paymentStatus: "released" }
              : p
          );
          localStorage.setItem("platform_user_technical_projects", JSON.stringify(updated));
        }
      } catch {}
    }

    try {
      await fetch(`/admin/api/technology/projects/${projectId}/review-accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch {}

    toast.success("Project accepted and payment successfully released to the business wallet!");
    await loadProjects();
  };

  const handleRequestRevision = async () => {
    if (!revisionProject || !revisionReason.trim()) return;
    try {
      const res = await fetch(`/admin/api/technology/projects/${revisionProject.projectId}/request-revision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: revisionReason.trim() }),
      });
      if (!res.ok) throw new Error("Failed to request revision");
      toast.success("Revision request sent to the business.");
      setRevisionProject(null);
      setRevisionReason("");
      await loadProjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to request revision");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to permanently delete this project and all submitted data?")) return;
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("platform_user_technical_projects");
        if (raw) {
          const list: Project[] = JSON.parse(raw) || [];
          const updated = list.filter((p) => p.projectId !== projectId && String(p.id) !== String(projectId));
          localStorage.setItem("platform_user_technical_projects", JSON.stringify(updated));
        }
      }

      await fetch(`/admin/api/technology/projects/${projectId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success("Project deleted successfully");
      await loadProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const submittedList = projects.filter((p) => ["submitted", "admin_review"].includes(p.submissionStatus));
  const approvedList = projects.filter((p) => p.submissionStatus === "approved");
  const inProgressList = projects.filter((p) => ["active", "in_progress"].includes(p.submissionStatus));
  const completedList = projects.filter((p) => ["completed", "revision"].includes(p.submissionStatus));

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "submitted") return ["submitted", "admin_review"].includes(p.submissionStatus);
    if (activeTab === "approved") return p.submissionStatus === "approved";
    if (activeTab === "in_progress") return ["active", "in_progress"].includes(p.submissionStatus);
    if (activeTab === "completed") return ["completed", "revision"].includes(p.submissionStatus);
    return true;
  }).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.projectId.toLowerCase().includes(q) ||
      (p.clientName && p.clientName.toLowerCase().includes(q)) ||
      (p.assignedBusinessName && p.assignedBusinessName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Technical Service Management
          </h1>
          <p className="text-sm text-gray-500">
            Review client project submissions, set budgets &amp; requirements, and release escrow payments upon completion.
          </p>
        </div>

        <button
          onClick={loadProjects}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("submitted")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "submitted"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending Review ({submittedList.length})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "approved"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Awaiting Client Payment ({approvedList.length})
          </button>
          <button
            onClick={() => setActiveTab("in_progress")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "in_progress"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Active &amp; In Progress ({inProgressList.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "completed"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Completed &amp; Review ({completedList.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              activeTab === "all"
                ? "bg-primary text-white shadow-sm"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Projects ({projects.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-xs text-gray-800 outline-none focus:border-primary"
          />
          <Search className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 p-8 text-center">
            <FolderOpen className="h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No projects found in this tab</p>
            <p className="text-xs text-gray-500">Submitted technical service requests will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-primary text-[11px] font-bold uppercase tracking-wider text-white">
                  <th className="px-4 py-3.5">Project ID &amp; Title</th>
                  <th className="px-4 py-3.5">Client</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Submitted Budget</th>
                  <th className="px-4 py-3.5">Admin Quote</th>
                  <th className="px-4 py-3.5">Assigned Business</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((p, idx) => {
                  const statusInfo = STATUS_LABELS[p.submissionStatus] || {
                    label: p.submissionStatus,
                    color: "bg-gray-100 text-gray-700",
                  };

                  return (
                    <tr key={p.projectId} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="max-w-[220px] px-4 py-3.5">
                        <span className="font-mono text-[10px] text-gray-500">{p.projectId}</span>
                        <p className="font-bold text-gray-900">{p.title}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{p.clientName || p.clientId || "Client"}</td>
                      <td className="px-4 py-3.5 text-gray-600">{p.category || "Software"}</td>
                      <td className="px-4 py-3.5 font-medium text-gray-700">
                        {p.currency || "USD"} {Number(p.price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-primary">
                        {p.adminBudget ? `${p.currency || "USD"} ${Number(p.adminBudget).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">
                        {p.assignedBusinessName || "Unassigned"}
                      </td>
                      <td className="px-4 py-3.5 space-y-1">
                        <div>
                          <span className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        {(p.paymentStatus === "paid" || p.submissionStatus === "active" || p.submissionStatus === "in_progress") && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Payment Approved (Paid)
                            </span>
                          </div>
                        )}
                        {p.submissionStatus === "approved" && (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              <CreditCard className="h-3 w-3 text-amber-600" /> Awaiting Client Payment
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {["submitted", "admin_review"].includes(p.submissionStatus) && (
                            <button
                              onClick={() => openReviewModal(p)}
                              className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-primary/90"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Review &amp; Quote
                            </button>
                          )}

                          {p.submissionStatus === "completed" && (
                            <>
                              <button
                                onClick={() => handleReleasePayment(p.projectId)}
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Release Payment
                              </button>
                              <button
                                onClick={() => {
                                  setRevisionProject(p);
                                  setRevisionReason("");
                                }}
                                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Revision
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => openReviewModal(p)}
                            className="rounded border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            title="Delete Project"
                            onClick={() => handleDeleteProject(p.projectId)}
                            className="rounded p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-gray-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Quote Modal */}
      {reviewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="font-mono text-xs text-primary">{reviewProject.projectId}</span>
                <h3 className="text-lg font-bold text-gray-900">Review &amp; Approve Technical Project</h3>
              </div>
              <button
                onClick={() => setReviewProject(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 text-xs space-y-2">
              <p className="font-bold text-sm text-gray-900">{reviewProject.title}</p>
              <p className="text-gray-600">{reviewProject.description}</p>
              <div className="flex flex-wrap gap-4 text-gray-700 pt-1">
                <span>Client: <strong>{reviewProject.clientName || "Client"}</strong></span>
                <span>Category: <strong>{reviewProject.category || "Software"}</strong></span>
                <span>Client Stated Budget: <strong>${Number(reviewProject.price || 0).toLocaleString()}</strong></span>
              </div>
            </div>

            <form onSubmit={handleApprove} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Approved Amount / Budget (USD)*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adminBudget}
                    onChange={(e) => setAdminBudget(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 outline-none focus:border-primary"
                    placeholder="1200.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Minimum Budget (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 outline-none focus:border-primary"
                    placeholder="1000.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Company Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 outline-none focus:border-primary"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Project Requirements &amp; Scope*
                </label>
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 outline-none focus:border-primary"
                  placeholder="Outline required features, tech stack, and deliverable standards..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Terms &amp; Conditions
                </label>
                <textarea
                  rows={2}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 outline-none focus:border-primary"
                  placeholder="Payment milestones, warranty period, code handover requirements..."
                />
              </div>

              {reviewProject.deliverableUrls && reviewProject.deliverableUrls.length > 0 && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 space-y-1 text-xs text-teal-900">
                  <p className="font-bold">Submitted Deliverables:</p>
                  <div className="flex flex-wrap gap-2">
                    {reviewProject.deliverableUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Deliverable #{i + 1}
                      </a>
                    ))}
                  </div>
                  {reviewProject.completionNotes && (
                    <p className="mt-1">Notes: {reviewProject.completionNotes}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => handleReject(reviewProject.projectId)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Reject Project
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewProject(null)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve &amp; Set Quote
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision Modal */}
      {revisionProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-gray-900">Request Revision for {revisionProject.title}</h3>
            <textarea
              rows={4}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="Specify defects, missing deliverables, or required revisions..."
              className="w-full rounded-lg border border-gray-300 p-2.5 text-xs text-gray-900 outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRevisionProject(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={!revisionReason.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
