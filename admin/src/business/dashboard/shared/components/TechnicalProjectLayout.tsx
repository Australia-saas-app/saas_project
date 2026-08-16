"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import PageHeader from "@/src/shared/ui/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/shared/ui/ui/select";
import { Pagination } from "@/src/shared/ui/ui/pagination";
import { SearchInput } from "@/src/shared/ui/form/search-input";
import {
  Eye,
  X,
  Download,
  User,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Table } from "@/src/shared/ui/table/Table";
import { TableHeading } from "@/src/shared/ui/table/TableHeading";
import { TableRow } from "@/src/shared/ui/table/TableRow";
import { TableColumn } from "@/src/shared/ui/table/TableColumn";
import { Button } from "@/src/shared/ui/ui/button";
import { apiClient } from "@/src/infra/api/apiClient";
import { toast } from "sonner";
import { useAppSelector } from "@/src/core/store/hooks";

export interface ProjectItem {
  id: string | number;
  projectId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  projectType?: string;
  skills?: string[];
  preferredLanguages?: string[];
  paymentTerms?: string;
  price?: number;
  adminBudget?: number;
  minBudget?: number;
  commissionPercent?: number;
  currency?: string;
  submissionStatus: string;
  paymentStatus: string;
  paidAmount?: number;
  startDate?: string;
  endDate?: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  attachmentFile?: { name: string; url: string; size?: number; type?: string };
  requirements?: string;
  conditions?: string;
  adminNotes?: string;
  createdAt?: string;
}

export default function TechnicalProjectLayout() {
  const token = useAppSelector((state: any) => state.auth.token);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subCategoryFilter, setSubCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"project" | "my-project" | "refund" | "report">("project");

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminBudgetInput, setAdminBudgetInput] = useState("");
  const [commissionPercentInput, setCommissionPercentInput] = useState("10");
  const [requirementsInput, setRequirementsInput] = useState("");
  const [conditionsInput, setConditionsInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    let remoteProjects: ProjectItem[] = [];
    try {
      const res = await apiClient.get<any>("/technology/projects/all", { skipErrorToast: true });
      if (res?.projects && Array.isArray(res.projects)) {
        remoteProjects = res.projects;
      } else if (Array.isArray(res)) {
        remoteProjects = res;
      } else if (res?.data && Array.isArray(res.data)) {
        remoteProjects = res.data;
      }
    } catch {
      // ignore
    }

    let localProjects: ProjectItem[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("platform_user_technical_projects");
        if (raw) localProjects = JSON.parse(raw) || [];
      } catch {}
    }

    const map = new Map<string, ProjectItem>();
    remoteProjects.forEach((p) => {
      if (p && (p.projectId || (p as any).id)) {
        const key = p.projectId || String((p as any).id);
        map.set(key, {
          ...p,
          id: key,
          projectId: p.projectId || key,
        });
      }
    });

    localProjects.forEach((p) => {
      if (p && (p.projectId || (p as any).id)) {
        const key = p.projectId || String((p as any).id);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, {
            ...p,
            id: key,
            projectId: p.projectId || key,
          });
        } else {
          const isPaid =
            p.paymentStatus?.toLowerCase() === "paid" ||
            existing.paymentStatus?.toLowerCase() === "paid" ||
            p.submissionStatus === "active" ||
            existing.submissionStatus === "active";

          map.set(key, {
            ...existing,
            ...p,
            id: key,
            projectId: p.projectId || key,
            paymentStatus: isPaid ? "paid" : existing.paymentStatus || p.paymentStatus,
            submissionStatus: isPaid && existing.submissionStatus === "approved" ? "active" : (p.submissionStatus || existing.submissionStatus),
          });
        }
      }
    });

    setProjects(Array.from(map.values()));
    setLoading(false);
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

  const openInspectionModal = (p: ProjectItem) => {
    setSelectedProject(p);
    const baseVal = Number(p.adminBudget || p.price || 1000);
    setAdminBudgetInput(String(baseVal));
    setCommissionPercentInput(String(p.commissionPercent !== undefined ? p.commissionPercent : 10));
    setRequirementsInput(p.requirements || "Full compliance with technical specifications and code quality guidelines.");
    setConditionsInput(p.conditions || "Work must be delivered within the agreed timeline with documentation.");
    setAdminNotesInput(p.adminNotes || "");
    setModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedProject) return;
    const b = parseFloat(adminBudgetInput);
    if (!b || b <= 0) {
      toast.error("Please enter a valid approved budget amount.");
      return;
    }

    const comm = parseFloat(commissionPercentInput) || 10;
    setActionLoading(true);

    try {
      await apiClient.post(`/technology/projects/${selectedProject.projectId}/admin-approve`, {
        adminBudget: b,
        minBudget: b,
        commissionPercent: comm,
        requirements: requirementsInput,
        conditions: conditionsInput,
        adminNotes: adminNotesInput,
      }).catch(() => undefined);

      // Sync local storage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("platform_user_technical_projects");
          if (raw) {
            const list: ProjectItem[] = JSON.parse(raw) || [];
            const updated = list.map((p) =>
              p.projectId === selectedProject.projectId
                ? {
                    ...p,
                    submissionStatus: "approved",
                    adminBudget: b,
                    minBudget: b,
                    commissionPercent: comm,
                    requirements: requirementsInput,
                    conditions: conditionsInput,
                    adminNotes: adminNotesInput,
                  }
                : p
            );
            localStorage.setItem("platform_user_technical_projects", JSON.stringify(updated));
          }

          // Dispatch notification to user
          const clientNotif = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: "Project Approved — Ready for Payment",
            message: `Admin approved "${selectedProject.title}" with a budget of ${selectedProject.currency || "USD"} ${b}. Please pay to publish.`,
            time: "Just now",
            read: false,
            href: "/dashboard/user/technical",
            type: "TECHNICAL_PROJECT_APPROVED",
          };
          const clientKeys = [
            `app_notifs_${selectedProject.clientId}`,
            `app_notifs_${selectedProject.clientEmail}`,
            "app_notifs_user",
          ].filter(Boolean) as string[];

          clientKeys.forEach((k) => {
            const ex = JSON.parse(localStorage.getItem(k) || "[]");
            localStorage.setItem(k, JSON.stringify([clientNotif, ...ex]));
          });
          window.dispatchEvent(new Event("notifications_updated"));
        } catch {}
      }

      toast.success(`Project ${selectedProject.projectId} approved! Status updated to Approved.`);
      setModalOpen(false);
      await loadProjects();
    } catch (e: any) {
      toast.error(e?.message || "Failed to approve project");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProject) return;
    setActionLoading(true);

    try {
      await apiClient.post(`/technology/projects/${selectedProject.projectId}/admin-reject`, {
        reason: adminNotesInput || "Project requirements could not be approved.",
      }).catch(() => undefined);

      // Sync local storage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("platform_user_technical_projects");
          if (raw) {
            const list: ProjectItem[] = JSON.parse(raw) || [];
            const updated = list.map((p) =>
              p.projectId === selectedProject.projectId
                ? {
                    ...p,
                    submissionStatus: "rejected",
                    adminNotes: adminNotesInput,
                  }
                : p
            );
            localStorage.setItem("platform_user_technical_projects", JSON.stringify(updated));
          }

          // Dispatch notification to user
          const clientNotif = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: "Project Review Update",
            message: `Your project "${selectedProject.title}" was not approved: ${adminNotesInput || "Does not meet requirements"}.`,
            time: "Just now",
            read: false,
            href: "/dashboard/user/technical",
            type: "TECHNICAL_PROJECT_REJECTED",
          };
          const clientKeys = [
            `app_notifs_${selectedProject.clientId}`,
            `app_notifs_${selectedProject.clientEmail}`,
            "app_notifs_user",
          ].filter(Boolean) as string[];

          clientKeys.forEach((k) => {
            const ex = JSON.parse(localStorage.getItem(k) || "[]");
            localStorage.setItem(k, JSON.stringify([clientNotif, ...ex]));
          });
          window.dispatchEvent(new Event("notifications_updated"));
        } catch {}
      }

      toast.success(`Project ${selectedProject.projectId} has been rejected.`);
      setModalOpen(false);
      await loadProjects();
    } catch (e: any) {
      toast.error(e?.message || "Failed to reject project");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      // Subtab filter
      if (activeTab === "my-project") {
        if (!["active", "in_progress"].includes(p.submissionStatus)) return false;
      } else if (activeTab === "refund") {
        if (!["rejected", "refunded", "cancelled"].includes(p.submissionStatus)) return false;
      } else if (activeTab === "report") {
        if (!["revision", "completed"].includes(p.submissionStatus)) return false;
      }

      // Search query
      if (q) {
        const matches =
          p.projectId.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.clientEmail?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Category filter
      if (categoryFilter !== "all" && p.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Subcategory filter
      if (subCategoryFilter !== "all" && p.subcategory?.toLowerCase() !== subCategoryFilter.toLowerCase()) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending" && !["submitted", "admin_review"].includes(p.submissionStatus)) return false;
        if (statusFilter === "approved" && p.submissionStatus !== "approved") return false;
        if (statusFilter === "active" && p.submissionStatus !== "active") return false;
        if (statusFilter === "in_progress" && p.submissionStatus !== "in_progress") return false;
        if (statusFilter === "completed" && p.submissionStatus !== "completed") return false;
        if (statusFilter === "rejected" && p.submissionStatus !== "rejected") return false;
      }

      return true;
    });
  }, [projects, search, categoryFilter, subCategoryFilter, statusFilter, activeTab]);

  const totalResults = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedProjects = filteredProjects.slice((page - 1) * pageSize, page * pageSize);

  const tabClass = (active: boolean) =>
    active
      ? "px-5 py-2 rounded-xl font-bold text-xs bg-blue-600 text-white shadow-xs transition-colors cursor-pointer"
      : "px-5 py-2 rounded-xl font-bold text-xs bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer";

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[80vh] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader title="Technical" />
        <button
          type="button"
          onClick={loadProjects}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Symmetrical Full-Width Filters Toolbar Card */}
      <div className="w-full bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search bar */}
          <div className="flex-1 min-w-[200px] sm:min-w-[240px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search projects..."
              className="w-full"
            />
          </div>

          {/* All Country */}
          <div className="w-[120px]">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs">
                <SelectValue placeholder="All Country" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">All Country</SelectItem>
                <SelectItem value="australia" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Australia</SelectItem>
                <SelectItem value="usa" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">USA</SelectItem>
                <SelectItem value="uk" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">UK</SelectItem>
                <SelectItem value="canada" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Canada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 px-2.5 w-[130px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            />
            <span className="text-slate-400 font-bold text-[11px] uppercase">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 px-2.5 w-[130px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            />
          </div>

          {/* All Category */}
          <div className="w-[140px]">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs">
                <SelectValue placeholder="All Category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">All Category</SelectItem>
                <SelectItem value="Software Development" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Software Development</SelectItem>
                <SelectItem value="Web Design & UI/UX" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Web Design & UI/UX</SelectItem>
                <SelectItem value="QA & Testing" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">QA & Testing</SelectItem>
                <SelectItem value="Troubleshooting" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Troubleshooting</SelectItem>
                <SelectItem value="Maintenance" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Sub Category */}
          <div className="w-[145px]">
            <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
              <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs">
                <SelectValue placeholder="All Sub Category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">All Sub Category</SelectItem>
                <SelectItem value="Web Development" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Web Development</SelectItem>
                <SelectItem value="Mobile App" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Mobile App</SelectItem>
                <SelectItem value="API & Backend" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">API & Backend</SelectItem>
                <SelectItem value="General" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* All Status */}
          <div className="w-[125px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-xs font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">All Status</SelectItem>
                <SelectItem value="pending" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Pending</SelectItem>
                <SelectItem value="approved" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Approved</SelectItem>
                <SelectItem value="active" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Active</SelectItem>
                <SelectItem value="in_progress" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">In Progress</SelectItem>
                <SelectItem value="completed" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Completed</SelectItem>
                <SelectItem value="rejected" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-lg text-xs">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Subtabs Under Filter Card */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setActiveTab("project")} className={tabClass(activeTab === "project")}>
          Project ({projects.length})
        </button>
        <button onClick={() => setActiveTab("my-project")} className={tabClass(activeTab === "my-project")}>
          My Project ({projects.filter((p) => ["active", "in_progress"].includes(p.submissionStatus)).length})
        </button>
        <button onClick={() => setActiveTab("refund")} className={tabClass(activeTab === "refund")}>
          Refund Project ({projects.filter((p) => ["rejected", "refunded", "cancelled"].includes(p.submissionStatus)).length})
        </button>
        <button onClick={() => setActiveTab("report")} className={tabClass(activeTab === "report")}>
          Report Project ({projects.filter((p) => ["revision", "completed"].includes(p.submissionStatus)).length})
        </button>
      </div>

      {/* Data Table */}
      <div className="mt-2 w-full overflow-x-auto">
        <div className="min-w-[1000px]">
          <Table>
            <TableHeading>
              <TableColumn isHeader align="center" className="font-bold">Project ID</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Category</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Total Amount</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Paid Amount</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Due Amount</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Duration</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Payment</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Status</TableColumn>
              <TableColumn isHeader align="center" className="font-bold">Action</TableColumn>
            </TableHeading>
            <tbody>
              {loading ? (
                <TableRow>
                  <TableColumn colSpan={9}>
                    <div className="flex flex-col items-center justify-center gap-2.5 py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold text-slate-500">Loading technical projects...</p>
                    </div>
                  </TableColumn>
                </TableRow>
              ) : paginatedProjects.length === 0 ? (
                <TableRow>
                  <TableColumn colSpan={9}>
                    <div className="flex flex-col items-center justify-center gap-2 py-12">
                      <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No projects found</h3>
                      <p className="text-xs text-slate-400">Try adjusting your search terms or filter selections.</p>
                    </div>
                  </TableColumn>
                </TableRow>
              ) : (
                paginatedProjects.map((p) => {
                  const baseBudget = Number(p.adminBudget || p.price || 0);
                  const commission = (baseBudget * (p.commissionPercent !== undefined ? p.commissionPercent : 10)) / 100;
                  const totalAmountNum = baseBudget + commission;
                  const currency = p.currency || "USD";

                  const isPaid =
                    p.paymentStatus?.toLowerCase() === "paid" ||
                    p.paymentStatus?.toLowerCase() === "released" ||
                    Boolean(p.paidAmount && Number(p.paidAmount) > 0) ||
                    ["active", "in_progress", "completed", "accepted"].includes(
                      (p.submissionStatus || "").toLowerCase()
                    );

                  const paidAmountStr = isPaid
                    ? `${currency} $${totalAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `${currency} $0.00`;
                  const dueAmountStr = isPaid
                    ? `${currency} $0.00`
                    : `${currency} $${totalAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

                  const rawStatus = (p.submissionStatus || "pending").toLowerCase();
                  let displayStatus = "Pending";
                  let statusBadgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";

                  if (rawStatus === "approved" || rawStatus === "payment_pending") {
                    displayStatus = "Approved";
                    statusBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
                  } else if (rawStatus === "active" || rawStatus === "in_progress") {
                    displayStatus = "Active";
                    statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
                  } else if (rawStatus === "completed" || rawStatus === "accepted") {
                    displayStatus = "Completed";
                    statusBadgeStyle = "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900";
                  } else if (rawStatus === "rejected") {
                    displayStatus = "Rejected";
                    statusBadgeStyle = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
                  }

                  // Calculate Duration in Days
                  let durationText = "10 Days";
                  if (p.startDate && p.endDate) {
                    const start = new Date(p.startDate);
                    const end = new Date(p.endDate);
                    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                      durationText = `${diffDays} Day${diffDays === 1 ? "" : "s"}`;
                    }
                  } else if (p.startDate) {
                    durationText = "Flexible";
                  }

                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Project ID */}
                      <TableColumn align="center" className="align-middle">
                        <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {p.projectId}
                        </span>
                      </TableColumn>

                      {/* Category - breaks onto new line for big names */}
                      <TableColumn align="center" className="align-middle">
                        <div className="max-w-[120px] mx-auto text-center text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug whitespace-normal break-words">
                          {p.category || "Software Development"}
                        </div>
                      </TableColumn>

                      {/* Total Amount */}
                      <TableColumn align="center" className="align-middle">
                        <span className="text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {currency} ${totalAmountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </TableColumn>

                      {/* Paid Amount */}
                      <TableColumn align="center" className="align-middle">
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {paidAmountStr}
                        </span>
                      </TableColumn>

                      {/* Due Amount */}
                      <TableColumn align="center" className="align-middle">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {dueAmountStr}
                        </span>
                      </TableColumn>

                      {/* Duration in Days */}
                      <TableColumn align="center" className="align-middle">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {durationText}
                        </span>
                      </TableColumn>

                      {/* Payment Status */}
                      <TableColumn align="center" className="align-middle">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900"
                          }`}
                        >
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </TableColumn>

                      {/* Status */}
                      <TableColumn align="center" className="align-middle">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadgeStyle}`}>
                          {displayStatus}
                        </span>
                      </TableColumn>

                      {/* Action */}
                      <TableColumn align="center" className="align-middle">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openInspectionModal(p)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg cursor-pointer"
                          title="Inspect & Review Project"
                        >
                          <Eye size={17} />
                        </Button>
                      </TableColumn>
                    </TableRow>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex justify-end pt-2">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          pageSize={pageSize}
          totalResults={totalResults}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {/* Inspection & Review Action Modal */}
      {modalOpen && selectedProject && (() => {
        const baseBudget = Number(selectedProject.adminBudget || selectedProject.price || 0);
        const calcBudget = parseFloat(adminBudgetInput) || baseBudget;
        const calcComm = parseFloat(commissionPercentInput) || 10;
        const totalDue = calcBudget + (calcBudget * calcComm) / 100;
        const currency = selectedProject.currency || "USD";
        const createdAtFormatted = selectedProject.createdAt && !isNaN(new Date(selectedProject.createdAt).getTime())
            ? new Date(selectedProject.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })
            : "NA";

        const isPending =
          selectedProject.submissionStatus === "pending" ||
          selectedProject.submissionStatus === "submitted" ||
          !selectedProject.submissionStatus;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-hidden">
            <div
              style={{ maxWidth: "580px", width: "100%" }}
              className="relative w-full rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[82vh] animate-in fade-in duration-200 overflow-hidden"
            >
              {/* Header (Sticky / Fixed at top) */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3 shrink-0 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                    {selectedProject.projectId}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Project Review &amp; Approval
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
                {/* Client Information Section */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3.5 border border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Client Contact Information
                  </span>
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Full Name</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <User className="h-3.5 w-3.5 text-blue-500" /> {selectedProject.clientName || "User"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Email</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5 mt-0.5">
                        <Mail className="h-3.5 w-3.5 text-blue-500" /> {selectedProject.clientEmail || "No Email"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Phone</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3.5 w-3.5 text-blue-500" /> {selectedProject.clientPhone || "No Phone"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Created At</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" /> {createdAtFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Project Info Section */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3.5 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Project Scope &amp; Info
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                      {selectedProject.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Category: <strong className="text-slate-800 dark:text-slate-200">{selectedProject.category}</strong>
                      {selectedProject.subcategory && ` • ${selectedProject.subcategory}`}
                      {selectedProject.projectType && ` • ${selectedProject.projectType}`}
                    </p>
                  </div>

                  {selectedProject.description && (
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedProject.description}
                    </div>
                  )}

                  {/* Tech Stack Skills */}
                  {selectedProject.skills && selectedProject.skills.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Required Skills</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProject.skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-2 py-0.5 text-[11px] font-semibold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachment File */}
                  {selectedProject.attachmentFile && (
                    <div className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {selectedProject.attachmentFile.name}
                        </span>
                      </div>
                      <a
                        href={selectedProject.attachmentFile.url}
                        download={selectedProject.attachmentFile.name}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline shrink-0 ml-2"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  )}
                </div>

              {/* Admin Approval & Quote Section */}
                <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-amber-600" /> Admin Pricing &amp; Terms
                    </span>
                    {!isPending && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        Status: {selectedProject.submissionStatus}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Approved Budget ($)</label>
                      <input
                        type="number"
                        disabled={!isPending}
                        value={adminBudgetInput}
                        onChange={(e) => setAdminBudgetInput(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Commission Rate (%)</label>
                      <input
                        type="number"
                        disabled={!isPending}
                        value={commissionPercentInput}
                        onChange={(e) => setCommissionPercentInput(e.target.value)}
                        className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Total Escrow Due</label>
                      <div className="h-8 px-2.5 flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-extrabold text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                        {currency} ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Delivery Requirements</label>
                    <input
                      type="text"
                      disabled={!isPending}
                      value={requirementsInput}
                      onChange={(e) => setRequirementsInput(e.target.value)}
                      placeholder="Technical specifications and acceptance criteria"
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Admin Notes</label>
                    <input
                      type="text"
                      disabled={!isPending}
                      value={adminNotesInput}
                      onChange={(e) => setAdminNotesInput(e.target.value)}
                      placeholder="Internal or feedback note to client"
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons (Sticky / Fixed at bottom) */}
              <div className="flex items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800 px-5 py-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="text-[11px] text-slate-500 font-medium">
                  {!isPending && (
                    <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                      Action already applied ({selectedProject.submissionStatus})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={actionLoading}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  {isPending && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleReject}
                        className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleApprove}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                      >
                        {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Approve Project
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}