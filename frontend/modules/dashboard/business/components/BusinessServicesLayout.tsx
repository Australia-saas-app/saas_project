"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  SERVICE_CATEGORIES,
  type BusinessServiceRow,
  type ServiceStatus,
} from "../data/business-demo-data";
import { DashboardTablePagination } from "../../shared/components/DashboardTablePagination";
import AppModal from "../../shared/components/AppModal";
import { sortByMoney } from "../../shared/utils/sort-rows";
import { useLocale } from "@/src/shared/context/locale.provider";
import {
  addBusinessService,
  deleteBusinessService,
  formatDeadlineDisplay,
  getBusinessServices,
  serviceStatsFromRows,
  updateBusinessService,
} from "@/src/shared/lib/business-services-store";

const PAGE_SIZE = 8;
const TABS = ["allServices", "active", "pending", "completed"] as const;
type TabKey = (typeof TABS)[number];

const ROUTED_CATEGORIES: Record<string, string> = {
  Technical: "/business/technical/create",
  Courses: "/business/courses/create",
};

function matchesTab(row: BusinessServiceRow, tab: TabKey) {
  if (tab === "allServices") return true;
  if (tab === "active") return row.status === "Active";
  if (tab === "pending") return row.status === "Pending";
  return row.status === "Completed";
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
  const [services, setServices] = useState<BusinessServiceRow[]>([]);
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
  const [newService, setNewService] = useState({
    category: "Technical",
    client: "",
    budget: "",
    deadline: "",
  });

  useEffect(() => {
    setServices(getBusinessServices());
  }, []);

  const refresh = () => setServices(getBusinessServices());

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
  const stats = serviceStatsFromRows(services);

  const serviceStats = [
    { label: t.business.services.activeServices, value: String(stats.active) },
    { label: t.business.services.pendingApproval, value: String(stats.pending) },
    { label: t.business.services.completedJobs, value: String(stats.completed) },
    { label: t.business.services.monthlyRevenue, value: "$4,250" },
  ];

  const tabLabels: Record<TabKey, string> = {
    allServices: t.business.services.allServices,
    active: t.business.services.active,
    pending: t.business.services.pending,
    completed: t.business.services.completed,
  };

  function renderServiceStatus(status: ServiceStatus) {
    const styles: Record<ServiceStatus, string> = {
      Active: "bg-[#d6e4ff] text-blue-700",
      Pending: "bg-amber-100 text-amber-700",
      Completed: "bg-green-100 text-green-700",
      "On Hold": "bg-gray-100 text-gray-600",
    };
    const labels: Record<ServiceStatus, string> = {
      Active: t.business.services.active,
      Pending: t.business.services.pending,
      Completed: t.business.services.completed,
      "On Hold": "On Hold",
    };
    return (
      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}>
        {labels[status]}
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
    updateBusinessService(selectedService.id, {
      client: editClient.trim(),
      budget,
      deadline,
      status: editStatus,
    });
    refresh();
    setDetailOpen(false);
    toast.success(`Service ${selectedService.id} updated.`);
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

    addBusinessService(row);
    refresh();
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
        <button
          type="button"
          onClick={handleNewServiceClick}
          className="shrink-0 rounded bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-primary/90"
        >
          {t.business.services.newService}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {serviceStats.map((stat) => (
          <div key={stat.label} className="rounded border border-border bg-card p-4 shadow-sm">
            <p className="mb-1 text-xs font-bold text-primary">{stat.label}</p>
            <h3 className="text-xl font-bold text-foreground">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SERVICE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.name;
          const realCount =
            services.filter(
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
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "table" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageData.map((row) => (
              <div
                key={row.id}
                className="relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        {row.id}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {row.subCategory || row.category}
                      </span>
                    </div>
                    {renderServiceStatus(row.status)}
                  </div>

                  <div className="mt-3.5 space-y-2">
                    <h3 className="text-sm font-bold text-foreground leading-snug">
                      {row.title || `${row.category} Service Proposal`}
                    </h3>
                    {row.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{row.summary}</p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Budget</span>
                      <span className="font-bold text-foreground">{row.budget}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Deadline</span>
                      <span className="font-bold text-foreground">{row.deadline}</span>
                    </div>
                  </div>

                  {row.skills && row.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {row.skills.map((sk: string) => (
                        <span
                          key={sk}
                          className="rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-3">
                  <button
                    type="button"
                    onClick={() => openManage(row)}
                    className="rounded-lg bg-primary/10 px-3.5 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    Manage
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(row.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                    title={`Delete ${row.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
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
                    <td className="p-3 font-medium">{row.budget}</td>
                    <td className="p-3 text-muted-foreground">{row.deadline}</td>
                    <td className="p-3">{renderServiceStatus(row.status)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openManage(row)}
                          className="rounded bg-primary px-3 py-1 text-[10px] font-bold text-white hover:bg-primary/90"
                        >
                          {t.business.services.manage}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(row.id)}
                          className="rounded p-1 text-muted-foreground hover:text-rose-600 transition-colors"
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
          <div className="relative w-full max-w-md rounded-xl bg-card p-6 shadow-xl border border-border space-y-4 animate-in fade-in">
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
                  await new Promise((res) => setTimeout(res, 600));
                  try {
                    const raw = localStorage.getItem("business_service_rows");
                    if (raw) {
                      const parsed = JSON.parse(raw);
                      if (Array.isArray(parsed)) {
                        const updated = parsed.filter((s: any) => s.id !== deleteTargetId);
                        localStorage.setItem("business_service_rows", JSON.stringify(updated));
                      }
                    }
                  } catch (e) {
                    console.error(e);
                  }
                  deleteBusinessService(deleteTargetId);
                  setServices((prev) => prev.filter((s) => s.id !== deleteTargetId));
                  setIsDeleting(false);
                  toast.success(`Service ${deleteTargetId} deleted permanently.`);
                  setDeleteTargetId(null);
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
    </div>
  );
}
