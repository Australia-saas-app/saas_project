"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Briefcase,
  MessageCircle,
  Search,
  Trash2,
  Grid3x3,
  List,
  Loader2,
  AlertTriangle,
  Code,
  Eye,
  Settings,
  ShieldAlert,
  BadgeCheck,
  Upload,
  X,
  CheckCircle2,
  User,
  Mail,
  FileText,
  Download,
  Clock,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import {
  SERVICE_CATEGORIES,
  type BusinessServiceRow,
  type ServiceStatus,
} from "../data/business-demo-data";
import { useUser } from "@/src/context/user.provider";
import { fetchPublicProjects, fetchAssignedProjects, fetchMyApplications, applyForProject, recordActivityLog } from "@/src/modules/technical/services/technical.services";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import { PublicDetailModal } from "@/src/modules/shared/components/public/PublicDetailModal";
import { PublicApplyModal } from "@/src/modules/shared/components/public/PublicApplyModal";
import { DashboardTablePagination } from "../../shared/components/DashboardTablePagination";
import AppModal from "../../shared/components/AppModal";
import { sortByMoney } from "../../shared/utils/sort-rows";
import { useLocale } from "@/src/shared/context/locale.provider";
import {
  formatDeadlineDisplay,
  serviceStatsFromRows,
  getBusinessServices,
} from "@/src/shared/lib/business-services-store";
import axiosInstance from "@/src/shared/lib/axiosInstance";
import { DeliverableUploadModal } from "@/src/modules/technical/components/DeliverableUploadModal";
import { ProjectDeadlineCountdown } from "@/src/modules/technical/components/ProjectDeadlineCountdown";
import { ProjectChatModal } from "@/src/modules/technical/components/ProjectChatModal";

const PAGE_SIZE = 8;
const TABS = ["allServices", "active", "pending", "completed"] as const;
type TabKey = (typeof TABS)[number];

const ROUTED_CATEGORIES: Record<string, string> = {
  Technical: "/business/technical/create",
  Courses: "/business/courses/create",
};

function matchesTab(row: BusinessServiceRow, tab: TabKey) {
  const isAssigned = Boolean((row as any).isAssigned || (row as any).isInProgress);
  const isAccepted = row.status === "Completed" || (row as any).rawProject?.submissionStatus === "accepted";
  if (tab === "allServices") return true;
  if (tab === "completed") return isAccepted;
  if (tab === "active") return !isAccepted && (isAssigned || (row.status === "Active" && !(row as any).isApplied));
  if (tab === "pending") return !isAccepted && !isAssigned && (row.status === "Pending" || (row as any).isApplied);
  return false;
}

function deadlineToInputValue(deadline: string): string {
  const parsed = new Date(deadline);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  const parts = deadline.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (parts) {
    const d = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

export default function BusinessServicesLayout() {
  const router = useRouter();
  const { t } = useLocale();
  const { user } = useUser();
  const [services, setServices] = useState<BusinessServiceRow[]>(() => getBusinessServices());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<BusinessServiceRow | null>(null);
  const [editStatus, setEditStatus] = useState<ServiceStatus>("Pending");
  const [editDeadline, setEditDeadline] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("allServices");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"Up" | "Down">("Down");
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [publicDetailModalItem, setPublicDetailModalItem] = useState<any | null>(null);
  const [applyModalItem, setApplyModalItem] = useState<any | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => (typeof window !== "undefined" ? getBusinessServices().length === 0 : false));
  const [deliverableProject, setDeliverableProject] = useState<any | null>(null);
  const [assignedDetailProject, setAssignedDetailProject] = useState<any | null>(null);
  const [chatProject, setChatProject] = useState<any | null>(null);
  const isInitialLoadRef = useRef(true);
  const [newService, setNewService] = useState({
    category: "Technical",
    client: "",
    budget: "",
    deadline: "",
  });

  const load = async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      const uId = (user as any)?.id || (user as any)?.userId || (user as any)?.sub;
      const appliedKey = uId ? `business_applied_projects_${uId}` : null;
      let storageAppliedIds: string[] = [];
      if (appliedKey && typeof window !== "undefined") {
        try {
          storageAppliedIds = JSON.parse(localStorage.getItem(appliedKey) || "[]");
        } catch {}
      }

      const [pubProjRes, assignedProjRes, myAppsRes, techServicesRes] = await Promise.all([
        fetchPublicProjects().catch(() => ({ projects: [] })),
        fetchAssignedProjects().catch(() => ({ projects: [] })),
        fetchMyApplications().catch(() => ({ appliedProjectIds: [] as string[], projects: [] as any[], proposals: [] as any[] })),
        axiosInstance.get('/technology/services').catch(() => null),
      ]);

      const dbAppliedIds: string[] = Array.isArray(myAppsRes?.appliedProjectIds) ? myAppsRes.appliedProjectIds : [];
      const appliedIds = Array.from(new Set([...storageAppliedIds, ...dbAppliedIds]));
      if (appliedKey && typeof window !== "undefined" && dbAppliedIds.length > 0) {
        try {
          const currentStorage = localStorage.getItem(appliedKey);
          const newStorage = JSON.stringify(appliedIds);
          if (currentStorage !== newStorage) {
            localStorage.setItem(appliedKey, newStorage);
          }
        } catch {}
      }

      const publicProjects = Array.isArray(pubProjRes?.projects) ? pubProjRes.projects : [];
      const assignedProjects = Array.isArray(assignedProjRes?.projects) ? assignedProjRes.projects : [];
      const appliedProjects = Array.isArray((myAppsRes as any)?.projects) ? (myAppsRes as any).projects : [];

      const seenProjectIds = new Set<string>();
      const combinedProjects = [...appliedProjects, ...assignedProjects, ...publicProjects].filter((p: any) => {
        const key = String(p.projectId || p.id || "");
        if (!key || seenProjectIds.has(key)) return false;
        seenProjectIds.add(key);
        return true;
      });

      const mappedProjects: BusinessServiceRow[] = combinedProjects.map((p: any) => {
        const pId = p.projectId || `PRJ-${p.id}`;
        const isApplied =
          Boolean((p as any).isApplied) ||
          appliedIds.includes(pId) ||
          appliedIds.includes(String(p.id)) ||
          appliedIds.includes(String(p.projectId));
        const isAssigned = Boolean(
          p.assignedBusinessId && uId && (
            p.assignedBusinessId === uId ||
            p.assignedBusinessId === (user as any)?.userId ||
            p.assignedBusinessId === (user as any)?.id
          )
        ) || Boolean(
          p.assignedBusinessEmail && (
            p.assignedBusinessEmail === (user as any)?.email
          )
        );
        const isCompleted = p.submissionStatus === "completed" || p.submissionStatus === "accepted";
        const isInProgress = isAssigned && (p.submissionStatus === "active" || p.submissionStatus === "in_progress");

        return {
          id: pId,
          category: p.category || "Software Development",
          client: p.clientName || "Client",
          budget: `$${Number(p.adminBudget || p.price || (p as any).budgetAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          deadline: p.endDate ? formatDeadlineDisplay(p.endDate) : (p.duration || "14 Days"),
          status: isCompleted ? "Completed" : isInProgress ? "Active" : isApplied ? "Pending" : ("Open" as any),
          title: p.title || "Technical Project",
          summary: p.description || "",
          subCategory: p.subcategory || p.projectType || "Technical Project",
          skills: p.skills || (p.preferredLanguages ? p.preferredLanguages : []),
          deliverables: p.deliverableUrls || [],
          coverUrl: p.attachmentFile || "",
          languages: p.preferredLanguages || p.languages || [],
          priceRange: `$${Number(p.adminBudget || p.price || (p as any).budgetAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD`,
          isApplied,
          isAssigned,
          isInProgress,
          rawProject: p,
        } as any;
      });

      const projectMap = new Map<string, BusinessServiceRow>();
      mappedProjects.forEach((item) => {
        if (item.id) projectMap.set(item.id, item);
      });

      const dataList = Array.isArray(techServicesRes?.data)
        ? techServicesRes.data
        : techServicesRes?.data?.data || [];

      dataList.forEach((item: any) => {
        let desc: any = {};
        try { desc = JSON.parse(item.description); } catch (e) {}
        const sId = item.serviceId || `SRV-${item.id}`;
        if (!projectMap.has(sId)) {
          projectMap.set(sId, {
            id: sId,
            category: item.categoryName || "Technical",
            client: desc.client || "Listing",
            budget: desc.budget || "$0",
            deadline: desc.deadline || "TBD",
            status: item.isVisible ? "Active" : "Pending",
            title: item.title,
            summary: desc.summary || "",
            subCategory: desc.subCategory || item.tag || "",
            skills: desc.skills || [],
            deliverables: desc.deliverables || [],
            coverUrl: item.photo || "",
          });
        }
      });

      setServices(Array.from(projectMap.values()));
    } catch (err: any) {
      console.warn("Failed to fetch services:", err?.message || err);
    } finally {
      isInitialLoadRef.current = false;
      setIsLoading(false);
    }
  };

  const currentUserId = (user as any)?.id || (user as any)?.userId || (user as any)?.sub;

  useEffect(() => {
    const cached = getBusinessServices();
    if (cached.length === 0) {
      load(true);
    } else {
      load(false);
    }
    const handleUpdate = () => load(false);
    window.addEventListener("applied_projects_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    return () => {
      window.removeEventListener("applied_projects_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [currentUserId]);

  const refresh = () => load(true);

  const handleApplyProject = async (row: any) => {
    setApplyingId(row.id);

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
      setApplyingId(null);
      setPublicDetailModalItem(null);
      setKycModalOpen(true);
      return;
    }

    const uId = (user as any)?.id || (user as any)?.userId || (user as any)?.sub || "business_user";
    const appliedKey = `business_applied_projects_${uId}`;

    let profileOverrides: any = {};
    if (typeof window !== "undefined") {
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
      const realAvatar =
        latestUser?.avatarUrl ||
        latestUser?.profilePhoto ||
        (user as any)?.avatarUrl ||
        (user as any)?.profilePhoto ||
        (typeof window !== "undefined" ? localStorage.getItem(`profile_override_${(user as any)?.userId || (user as any)?.id}`) : "") ||
        "";

      await applyForProject(row.id, {
        proposal: `Business application for project "${row.title}"`,
        price: parseFloat(String(row.budget || "").replace(/[^0-9.]/g, "")) || 0,
        currency: "USD",
        timeline: "14 Days",
        paymentType: "one-time",
        businessName: realBusinessName,
        userName: realFullName,
        fullName: realFullName,
        businessType: realBusinessType,
        businessId: realCustomId,
        avatar: realAvatar,
        profilePhoto: realAvatar,
        avatarUrl: realAvatar,
        kycStatus: "verified",
      });
    } catch (e: any) {
      console.error("applyForProject api error:", e);
    }
    try {
      const existing = JSON.parse(localStorage.getItem(appliedKey) || "[]");
      const allIds = [row.id, row.rawProject?.projectId, String(row.rawProject?.id || ""), `PRJ-${row.rawProject?.id}`].filter(Boolean) as string[];
      const merged = Array.from(new Set([...existing, ...allIds]));
      localStorage.setItem(appliedKey, JSON.stringify(merged));
    } catch {}

    try {
      recordActivityLog({
        title: `Applied to project: "${row.title}" (${row.id})`,
        description: `Applied for project (${row.id}). Status: Pending for Client Approval.`,
        category: "Technical Services",
        type: "PROJECT_APPLIED",
        userId: uId,
        userName: realFullName,
        email: (user as any)?.email,
      });
      await recordRealActivity(
        "PROJECT_APPLIED",
        `Applied for project "${row.title}" (${row.id}). Status: Pending for Client Approval.`,
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

    toast.success(`Successfully applied to project "${row.title}" (${row.id})! Pending client approval.`);
    setApplyingId(null);
    load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = services.filter((row) => {
      if (!matchesTab(row, activeTab)) return false;
      if (selectedCategory && row.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        row.client.toLowerCase().includes(q) ||
        row.budget.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      );
    });
    return sortByMoney(rows, (r) => r.budget, sortDir);
  }, [activeTab, search, selectedCategory, sortDir, services]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = services.filter((s) => !((s as any).isAssigned || (s as any).isInProgress) && (s.status === "Pending" || (s as any).isApplied)).length;
  const activeCount = services.filter((s) => (s as any).isAssigned || (s as any).isInProgress || (s.status === "Active" && !(s as any).isApplied)).length;
  const completedCount = services.filter((s) => s.status === "Completed").length;

  const monthlyRevenueNumber = useMemo(() => {
    let sum = 0;
    const uId = (user as any)?.id || (user as any)?.userId || (user as any)?.sub;
    const uEmail = (user as any)?.email;

    services.forEach((s: any) => {
      const p = s.rawProject;
      if (!p) return;

      const isAssigned =
        s.isAssigned ||
        Boolean(
          p.assignedBusinessId && uId && (
            p.assignedBusinessId === uId ||
            p.assignedBusinessId === (user as any)?.userId ||
            p.assignedBusinessId === (user as any)?.id
          )
        ) ||
        Boolean(
          p.assignedBusinessEmail && uEmail && p.assignedBusinessEmail === uEmail
        );

      if (!isAssigned) return;

      const totalBudget = Number(p.adminBudget || p.price || (p as any).budgetAmount || 0);
      if (totalBudget <= 0) return;

      const terms = (p.paymentTerms || "").toLowerCase();
      const mCount = terms.includes("three") || terms === "3" ? 3 : terms.includes("two") || terms === "2" ? 2 : 1;
      const perMilestone = totalBudget / mCount;

      if (p.submissionStatus === "accepted" || p.paymentStatus === "released") {
        sum += totalBudget;
      } else if (Array.isArray(p.milestones)) {
        const acceptedCount = p.milestones.filter((m: any) => m?.status === "accepted").length;
        sum += acceptedCount * perMilestone;
      }
    });
    return sum;
  }, [services, user]);

  const serviceStats = [
    { label: t.business.services.activeServices, value: String(activeCount) },
    { label: t.business.services.pendingApproval, value: String(pendingCount) },
    { label: t.business.services.completedJobs, value: String(completedCount) },
    {
      label: t.business.services.monthlyRevenue,
      value: `$${monthlyRevenueNumber.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
  ];

  const tabLabels: Record<TabKey, string> = {
    allServices: t.business.services.allServices,
    active: t.business.services.active,
    pending: t.business.services.pending,
    completed: t.business.services.completed,
  };

  function renderServiceStatus(status: any, isApplied?: boolean) {
    if (isApplied || status === "Pending") {
      return (
        <span className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
          Pending for Client Approval
        </span>
      );
    }
    const styles: Record<string, string> = {
      Active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
      Open: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25",
      Completed: "bg-green-100 text-green-700 border border-green-300",
      "On Hold": "bg-gray-100 text-gray-600 border border-gray-300",
    };
    return (
      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${styles[status] || styles.Open}`}>
        {status}
      </span>
    );
  }

  function openManage(row: BusinessServiceRow) {
    setSelectedService(row);
    setEditStatus(row.status);
    setEditDeadline(deadlineToInputValue(row.deadline));
    setEditClient(row.client);
    setEditBudget(row.budget.replace(/^\$/, ""));
    setDetailOpen(true);
  }

  function handleSaveManage() {
    if (!selectedService) return;
    if (!editClient.trim()) {
      toast.error("Client name is required.");
      return;
    }
    const budget = editBudget.startsWith("$") ? editBudget : `$${editBudget}`;
    const deadline = editDeadline ? formatDeadlineDisplay(editDeadline) : selectedService.deadline;
    try {
      const descriptionData = JSON.stringify({
        summary: selectedService.summary,
        budget: editBudget,
        deadline: editDeadline,
        subCategory: selectedService.subCategory,
        skills: selectedService.skills,
        deliverables: selectedService.deliverables,
        client: editClient
      });

      axiosInstance.patch(`/technology/services/${selectedService.id}`, {
        description: descriptionData,
        isVisible: editStatus === "Active"
      }).then(() => {
        toast.success("Service updated successfully.");
        setDetailOpen(false);
        refresh();
      });
    } catch (err: any) {
      toast.error("Failed to update service");
    }
  }

  function handleNewServiceClick() {
    const category = selectedCategory ?? "Technical";
    const route = ROUTED_CATEGORIES[category];
    if (route) {
      router.push(route);
      return;
    }
    setNewService({ category, client: "", budget: "", deadline: "" });
    setCreateOpen(true);
  }

  function handleCreateService(e: React.FormEvent) {
    e.preventDefault();
    if (!newService.client.trim()) {
      toast.error("Client name is required.");
      return;
    }
    if (!newService.budget.trim()) {
      toast.error("Budget is required.");
      return;
    }
    if (!newService.deadline.trim()) {
      toast.error("Deadline is required.");
      return;
    }

    const id = `SRV-${String(services.length + 1001)}`;
    const budget = newService.budget.startsWith("$") ? newService.budget : `$${newService.budget}`;
    const row: BusinessServiceRow = {
      id,
      category: newService.category,
      client: newService.client.trim(),
      budget,
      deadline: formatDeadlineDisplay(newService.deadline),
      status: "Pending",
    };

    // Placeholder for actual creation logic
    setServices((prev) => [...prev, row]);
    setCreateOpen(false);
    setNewService({
      category: selectedCategory ?? "Technical",
      client: "",
      budget: "",
      deadline: "",
    });
    setPage(1);
    toast.success(`Service ${id} created and pending approval.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Briefcase className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Business</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{t.business.services.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.business.services.subtitle}</p>
        </div>
        {/* 
        <button
          type="button"
          onClick={handleNewServiceClick}
          className="shrink-0 rounded bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          {t.business.services.newService}
        </button>
        */}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {serviceStats.map((stat) => (
          <div key={stat.label} className="rounded border border-border bg-card p-4 shadow-sm">
            <p className="mb-1 text-xs font-bold text-primary">{stat.label}</p>
            <h3 className="text-xl font-bold text-foreground">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Category Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SERVICE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.name;
          const realCount = services.filter(
            (s) =>
              s.category === cat.name ||
              (cat.name === "Technical" && (s.category === "Technical" || s.subCategory))
          ).length;

          return (
            <div
              key={cat.name}
              className={`relative flex flex-col justify-between rounded-lg border p-4 shadow-sm transition-all ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card hover:border-primary/30 text-foreground"
              }`}
            >
              <div>
                <div
                  className={`mb-3 h-1.5 w-10 rounded-full ${active ? "bg-white/80" : cat.color}`}
                />
                <p className={`text-xs font-bold ${active ? "text-white/90" : "text-primary"}`}>
                  {cat.name}
                </p>
                <p className={`mt-1 text-lg font-bold ${active ? "text-white" : "text-foreground"}`}>
                  {realCount}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-end border-t border-border/40 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(active ? null : cat.name);
                    setViewMode("grid");
                    setPage(1);
                  }}
                  className={`text-xs font-bold transition-all hover:underline ${
                    active ? "text-white" : "text-primary"
                  }`}
                >
                  View →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`rounded px-4 py-2 text-xs font-bold transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-white shadow-sm"
                    : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tabLabels[tab]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Category Dropdown Filter */}
            <select
              value={selectedCategory || "all"}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val === "all" ? null : val);
                setPage(1);
              }}
              className="h-8 rounded border border-border bg-background px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {SERVICE_CATEGORIES.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t.business.services.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded border border-border bg-background py-1.5 pr-3 pl-8 text-xs text-foreground focus:outline-none sm:w-52"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setSortDir(sortDir === "Up" ? "Down" : "Up")}
              className="flex items-center gap-1 rounded border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground"
            >
              {sortDir}
              {sortDir === "Up" ? (
                <ArrowUp className="h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5" />
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-muted/60 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "grid" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              {/* <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "table" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button> */}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[380px] w-full items-center justify-center py-16">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-[3px] border-primary/20" />
              <div className="absolute h-12 w-12 rounded-full border-[3px] border-transparent border-t-primary border-r-primary animate-spin" />
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="max-h-[600px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageData.map((row) => {
                const isRowAssigned = Boolean((row as any).isAssigned || (row as any).isInProgress);
                const isRowApplied = !isRowAssigned && Boolean((row as any).isApplied || row.status === "Pending" || (row.status as any) === "Pending for Client Approval");
                const rawP = (row as any).rawProject || {};

                return (
                  <article
                    key={row.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="h-1.5 bg-primary" />

                    <div className="flex flex-1 flex-col p-5">
                      {/* Header Row 1: ID + Countdown or Category */}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-primary self-start whitespace-nowrap shrink-0">
                          {row.id}
                        </span>
                        {isRowAssigned ? (
                          <ProjectDeadlineCountdown
                            projectId={String(rawP.projectId || rawP.id || row.id)}
                            endDate={rawP.endDate}
                            createdAt={rawP.createdAt}
                            assignedAt={rawP.assignedAt || rawP.acceptedAt}
                          />
                        ) : (
                          <span className="rounded-md bg-[#eef2f8] dark:bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary whitespace-nowrap shrink-0">
                            {row.subCategory || row.category || "Software Development"}
                          </span>
                        )}
                      </div>

                      {/* Header Row 2: Status Badge + Category (if assigned) */}
                      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                        {isRowAssigned ? (
                          rawP.submissionStatus === "accepted" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              Completed &amp; Paid ✓
                            </span>
                          ) : rawP.submissionStatus === "completed" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                              <Clock className="h-3 w-3 text-amber-500" />
                              Ready for Review
                            </span>
                          ) : rawP.submissionStatus === "revision" ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-orange-700 dark:text-orange-400">
                              <RotateCcw className="h-3 w-3 text-orange-500" />
                              Revision Requested
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
                              <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
                              In Progress
                            </span>
                          )
                        ) : isRowApplied ? (
                          <span className="rounded-md bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                            Pending for Client Approval
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            Active for Public
                          </span>
                        )}
                        {isRowAssigned && (
                          <span className="rounded-md bg-[#eef2f8] dark:bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary whitespace-nowrap shrink-0 ml-auto">
                            {row.subCategory || row.category || "Software Development"}
                          </span>
                        )}
                      </div>

                      {/* Budget */}
                      <div className="mb-2">
                        <span className="text-sm font-bold text-primary">{row.budget || (row as any).priceRange || "$1,300.00"}</span>
                      </div>

                      <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-foreground group-hover:text-primary">
                        {row.title || `${row.category} Service Project`}
                      </h3>

                      <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {row.summary || (row as any).description || "Create Full project with responsive design"}
                      </p>

                      {row.skills && row.skills.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {row.skills.map((sk: string) => (
                            <span
                              key={sk}
                              className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action Buttons */}
                      {isRowAssigned ? (
                        <div className="flex items-center justify-between gap-2.5 pt-2 mt-auto">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              title="View Full Project Details"
                              onClick={() => setAssignedDetailProject(rawP)}
                              className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border transition-all cursor-pointer shrink-0"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliverableProject(rawP)}
                            className="flex-1 rounded-full border border-border/80 bg-muted/40 hover:bg-primary/10 hover:border-primary/40 text-primary font-bold text-xs px-3.5 py-2 inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs min-w-0 truncate"
                          >
                            <Upload className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">Submit Project</span>
                          </button>
                          {rawP.submissionStatus === "accepted" ? (
                            <div className="inline-flex items-center gap-1.5 border-2 border-dashed border-emerald-600 dark:border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black uppercase text-[11px] px-3 py-1 rounded-md tracking-wider transform -rotate-12 shadow-sm select-none shrink-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                              Completed
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 border-2 border-dashed border-emerald-600 dark:border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black uppercase text-[11px] px-3 py-1 rounded-md tracking-wider transform -rotate-12 shadow-sm select-none shrink-0">
                              <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                              Assigned
                            </div>
                          )}
                        </div>
                      ) : isRowApplied ? (
                        <div className="flex items-center justify-between gap-3 pt-2 mt-auto">
                          <button
                            type="button"
                            className="flex-1 rounded-lg border border-border bg-background py-2 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => setPublicDetailModalItem(row)}
                          >
                            View Project
                          </button>
                          <div className="inline-flex items-center gap-1.5 border-2 border-dashed border-emerald-600 dark:border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black uppercase text-[11px] px-3 py-1 rounded-md tracking-wider transform -rotate-12 shadow-sm select-none">
                            <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
                            Applied
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full rounded-lg bg-primary py-2.5 text-xs font-semibold text-white hover:bg-primary/90 cursor-pointer shadow-xs transition-colors mt-auto"
                          onClick={() => setPublicDetailModalItem(row)}
                        >
                          View Project
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-primary font-bold text-white uppercase">
                  <th className="p-3">Service ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3">Deadline</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageData.map((row) => (
                  <tr key={row.id} className="text-foreground hover:bg-muted/50">
                    <td className="p-3 font-semibold">{row.id}</td>
                    <td className="p-3">{row.category}</td>
                    <td className="p-3 text-muted-foreground">{row.client}</td>
                    <td className="p-3 text-muted-foreground">{row.deadline}</td>
                    <td className="p-3 whitespace-nowrap">{renderServiceStatus(row.status, (row as any).isApplied)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPublicDetailModalItem(row)}
                          className="rounded bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        {(row as any).isApplied ? (
                          <span className="inline-flex items-center justify-center border-2 border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold uppercase text-[9px] px-2 py-0.5 rounded tracking-wider transform -rotate-6 select-none">
                            Applied
                          </span>
                        ) : ((row.status as any) === "Open" || row.status === "Active") ? (
                          <button
                            type="button"
                            disabled={applyingId === row.id}
                            onClick={() => handleApplyProject(row)}
                            className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {applyingId === row.id ? "Applying..." : "Apply"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openManage(row)}
                          className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                        >
                          {t.business.services.manage}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(row.id)}
                          className="rounded p-1 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                          title={`Delete ${row.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <DashboardTablePagination
          current={page}
          total={totalPages}
          pageSize={PAGE_SIZE}
          totalItems={filtered.length}
          onChange={setPage}
        />
      </div>

      <AppModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedService ? `Manage ${selectedService.id}` : "Service"}
        size="sm"
        description={selectedService?.client}
        icon={<Briefcase className="h-5 w-5" />}
        badge={
          selectedService ? (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
              {selectedService.status}
            </span>
          ) : undefined
        }
        footer={
          selectedService ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/business/messages?thread=TH-${selectedService.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <MessageCircle className="h-4 w-4" />
                Message client
              </Link>
              {selectedService.category === "Technical" && (
                <Link
                  href="/business/technical/create"
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Create technical project
                </Link>
              )}
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveManage}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Save changes
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedService && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
              <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm">
                {selectedService.category}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ServiceStatus)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                {(["Active", "Pending", "Completed", "On Hold"] as ServiceStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Client name</label>
              <input
                type="text"
                value={editClient}
                onChange={(e) => setEditClient(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Budget</label>
              <input
                type="text"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Deadline</label>
              <input
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </AppModal>

      <AppModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create new service"
        description="Add a service listing for your business. It will appear as pending until approved."
        icon={<Briefcase className="h-5 w-5" />}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="new-service-form"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Create service
            </button>
          </div>
        }
      >
        <form id="new-service-form" onSubmit={handleCreateService} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
            <select
              value={newService.category}
              onChange={(e) => setNewService((s) => ({ ...s, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            >
              {SERVICE_CATEGORIES.filter((cat) => !ROUTED_CATEGORIES[cat.name]).map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Technical and Courses services use dedicated create flows from the New Service button.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Client name</label>
            <input
              type="text"
              value={newService.client}
              onChange={(e) => setNewService((s) => ({ ...s, client: e.target.value }))}
              placeholder="Acme Corp"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Budget</label>
            <input
              type="text"
              value={newService.budget}
              onChange={(e) => setNewService((s) => ({ ...s, budget: e.target.value }))}
              placeholder="2500"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Deadline</label>
            <input
              type="date"
              value={newService.deadline}
              onChange={(e) => setNewService((s) => ({ ...s, deadline: e.target.value }))}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </form>
      </AppModal>

      {/* Theme Styled Permanent Delete Confirmation Modal with Spinner */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div 
            style={{ maxWidth: '400px' }}
            className="relative w-full max-w-sm rounded-xl bg-card p-6 shadow-xl border border-border space-y-4 animate-in fade-in"
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="rounded-full bg-rose-500/10 p-2.5">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Delete Service Listing</h2>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete service listing{" "}
              <strong className="text-foreground">{deleteTargetId}</strong>? This action will remove it permanently from the store and marketplace.
            </p>

            <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetId(null)}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                No, Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await axiosInstance.delete(`/technology/services/${deleteTargetId}`);
                    toast.success("Service deleted successfully.");
                    setDeleteTargetId(null);
                    refresh();
                  } catch (err: any) {
                    toast.error("Failed to delete service");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Public Detail Modal */}
      {publicDetailModalItem && (
        <PublicDetailModal
          open={Boolean(publicDetailModalItem)}
          onClose={() => setPublicDetailModalItem(null)}
          title={publicDetailModalItem.title || "Project Details"}
          subtitle={publicDetailModalItem.category}
          fields={[
            { label: "Project ID", value: publicDetailModalItem.id },
            { label: "Budget", value: publicDetailModalItem.budget || publicDetailModalItem.priceRange },
            { label: "Duration / Deadline", value: publicDetailModalItem.deadline || "14 Days" },
            {
              label: "Languages & Skills",
              value:
                (publicDetailModalItem.skills && publicDetailModalItem.skills.length > 0
                  ? publicDetailModalItem.skills.join(", ")
                  : (publicDetailModalItem.languages && publicDetailModalItem.languages.length > 0
                    ? publicDetailModalItem.languages.join(", ")
                    : "JavaScript, TypeScript, React")),
            },
            { label: "Description", value: publicDetailModalItem.summary || "No description provided." },
          ]}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
                onClick={() => setPublicDetailModalItem(null)}
              >
                Close
              </button>
              {(publicDetailModalItem as any)?.isApplied ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending for Client Approval
                </div>
              ) : ((publicDetailModalItem as any)?.status === "Open" || (publicDetailModalItem as any)?.status === "Active") ? (
                <button
                  type="button"
                  disabled={applyingId === publicDetailModalItem.id}
                  className="rounded-lg bg-primary px-5 py-2 text-xs font-bold text-white hover:bg-primary/90 cursor-pointer disabled:opacity-75 flex items-center gap-1.5 min-w-[140px] justify-center transition-all"
                  onClick={async () => {
                    const target = publicDetailModalItem;
                    await handleApplyProject(target);
                    setPublicDetailModalItem(null);
                  }}
                >
                  {applyingId === publicDetailModalItem.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    "Apply to project"
                  )}
                </button>
              ) : null}
            </div>
          }
        />
      )}

      {/* Live Public Apply Proposal Modal */}
      {applyModalItem && (
        <PublicApplyModal
          open={Boolean(applyModalItem)}
          onClose={() => setApplyModalItem(null)}
          type="technical"
          itemId={String(applyModalItem.id)}
          itemTitle={applyModalItem.title}
          title="Apply to technical project"
          description="Submit your proposal. The client and platform administrators will review your bid."
        />
      )}

      {/* Deliverable Upload Modal for assigned projects */}
      {deliverableProject && (
        <DeliverableUploadModal
          project={{
            projectId: String(deliverableProject.projectId || deliverableProject.id || ""),
            title: deliverableProject.title,
            paymentTerms: deliverableProject.paymentTerms,
            submissionStatus: (deliverableProject as any).submissionStatus,
            milestones: (deliverableProject as any).milestones,
            deliverableUrls: deliverableProject.deliverableUrls,
            deliverableFiles: deliverableProject.deliverableFiles,
            completionNotes: deliverableProject.completionNotes,
          }}
          onClose={() => setDeliverableProject(null)}
          onSuccess={() => {
            setDeliverableProject(null);
            load(true);
            toast.success("Deliverables submitted for client review!");
          }}
        />
      )}

      {/* Full Assigned Project Detail Modal */}
      {assignedDetailProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            style={{ maxWidth: "560px", width: "100%" }}
            className="w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-primary font-bold">
                    {assignedDetailProject.projectId || `PRJ-${assignedDetailProject.id}`}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    In Progress
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Assigned to You
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">{assignedDetailProject.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Category: <strong className="text-foreground">{assignedDetailProject.category || "Software Development"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignedDetailProject(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Project Scope &amp; Summary</p>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap rounded-xl bg-muted/40 p-3 border border-border">
                {assignedDetailProject.description || "No description provided."}
              </p>
            </div>

            {((assignedDetailProject.skills && assignedDetailProject.skills.length > 0) ||
              (assignedDetailProject.preferredLanguages && assignedDetailProject.preferredLanguages.length > 0)) && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Required Tech Stack &amp; Skills</p>
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/40 p-3 border border-border">
                  {(assignedDetailProject.preferredLanguages || []).map((l: string) => (
                    <span key={l} className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">{l}</span>
                  ))}
                  {(assignedDetailProject.skills || []).map((s: string) => (
                    <span key={s} className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-xl border border-border bg-muted/40 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Target Budget</span>
                <span className="text-sm font-extrabold text-primary">
                  {assignedDetailProject.currency || "USD"} ${Number(assignedDetailProject.adminBudget || assignedDetailProject.price || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Payment Terms</span>
                <span className="font-semibold text-foreground">{assignedDetailProject.paymentTerms || "One-time"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Timeline</span>
                <span className="font-semibold text-foreground">
                  {assignedDetailProject.startDate ? new Date(assignedDetailProject.startDate).toLocaleDateString() : "Active"}
                  {assignedDetailProject.endDate ? ` → ${new Date(assignedDetailProject.endDate).toLocaleDateString()}` : ""}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5 text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Client Contact Information</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
                <div className="flex items-center gap-2 text-foreground font-semibold">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span>{assignedDetailProject.clientName || "Client"}</span>
                </div>
                {assignedDetailProject.clientEmail && (
                  <div className="flex items-center gap-2 text-foreground font-medium">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span>{assignedDetailProject.clientEmail}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl p-3.5 border space-y-2 text-xs bg-emerald-500/10 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Escrow Funded &amp; Agreed Terms
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  Active in Progress
                </span>
              </div>
              {assignedDetailProject.requirements && (
                <p className="text-xs p-2.5 rounded-lg border bg-background/80 border-emerald-500/20">
                  <strong>Admin Requirements:</strong> {assignedDetailProject.requirements}
                </p>
              )}
              {assignedDetailProject.conditions && (
                <p className="text-xs p-2.5 rounded-lg border bg-background/80 border-emerald-500/20">
                  <strong>Delivery Conditions:</strong> {assignedDetailProject.conditions}
                </p>
              )}
            </div>

            {assignedDetailProject.attachmentFile && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Attached Scope &amp; Requirements File</p>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-foreground truncate">
                        {assignedDetailProject.attachmentFile.name || "Project-Requirements.pdf"}
                      </p>
                      {assignedDetailProject.attachmentFile.size && (
                        <p className="text-[10px] text-muted-foreground">
                          {(assignedDetailProject.attachmentFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                  <a
                    href={assignedDetailProject.attachmentFile.url}
                    download={assignedDetailProject.attachmentFile.name}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline shrink-0 ml-2"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setAssignedDetailProject(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = assignedDetailProject;
                  setAssignedDetailProject(null);
                  setDeliverableProject(p);
                }}
                className="rounded-xl bg-primary hover:bg-primary/90 text-white px-4 py-2 text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Submit Project Deliverables
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button
              type="button"
              onClick={() => setKycModalOpen(false)}
              className="rounded-lg border border-border px-4 py-2 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors w-full sm:w-auto min-w-[100px]"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setKycModalOpen(false);
                router.push("/dashboard/business/profile");
              }}
              className="rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-md transition-colors w-full sm:w-auto min-w-[140px]"
            >
              Apply for KYC
            </button>
          </div>
        </div>
      </AppModal>

      {/* Real-time Project Chat Modal */}
      {chatProject && (
        <ProjectChatModal
          project={{
            projectId: chatProject.projectId || chatProject.id,
            title: chatProject.title,
            clientName: chatProject.clientName || chatProject.client,
            clientEmail: chatProject.clientEmail,
            clientId: chatProject.clientId,
            assignedBusinessId: chatProject.assignedBusinessId,
            assignedBusinessUserId: chatProject.assignedBusinessUserId,
            assignedBusinessName: chatProject.assignedBusinessName,
            assignedBusinessFullName: chatProject.assignedBusinessFullName,
            assignedBusinessEmail: chatProject.assignedBusinessEmail,
          }}
          onClose={() => setChatProject(null)}
        />
      )}
    </div>
  );
}
