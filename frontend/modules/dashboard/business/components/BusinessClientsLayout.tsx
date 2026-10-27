"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, Users, Mail, X } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account";
import { DashboardTablePagination } from "@/src/modules/dashboard/shared/components/DashboardTablePagination";
import { BUSINESS_CLIENTS, type BusinessClient } from "../data/business-demo-data";

const PAGE_SIZE = 8;
const EMPTY_BUSINESS_CLIENTS: BusinessClient[] = [];
const STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  "On Hold": "bg-amber-100 text-amber-700",
  Inactive: "bg-gray-100 text-gray-600",
};

export default function BusinessClientsLayout() {
  const { t } = useLocale();
  const { isDemo, demoOrEmpty } = useIsDemoAccount();
  const p = t.businessPages.clients;
  const demoClients = demoOrEmpty(BUSINESS_CLIENTS, EMPTY_BUSINESS_CLIENTS);
  const [addedClients, setAddedClients] = useState<BusinessClient[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", industry: "" });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);

  const clients = useMemo(() => {
    const ids = new Set(demoClients.map((c) => c.id));
    return [...demoClients, ...addedClients.filter((c) => !ids.has(c.id))];
  }, [demoClients, addedClients]);

  const filtered = useMemo(() => {
    let rows = clients;
    if (filter !== "All") rows = rows.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.industry.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [search, filter, clients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{p.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{p.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90"
        >
          {p.addClient}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: p.totalClients, value: String(clients.length) },
          { label: p.active, value: String(clients.filter((c) => c.status === "Active").length) },
          { label: p.activeJobs, value: String(clients.reduce((s, c) => s + c.activeJobs, 0)) },
          { label: p.totalRevenue, value: isDemo ? "$72,950" : "$0" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-primary">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-md font-bold text-gray-900">{p.clientList}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={p.search}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-48 rounded border border-gray-200 py-1.5 pr-3 pl-8 text-xs focus:outline-none"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="rounded border border-gray-200 px-3 py-1.5 text-xs"
            >
              {["All", "Active", "On Hold", "Inactive"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-primary text-white uppercase font-bold">
                <th className="p-3 text-left">{p.clientId}</th>
                <th className="p-3 text-left">{p.name}</th>
                <th className="p-3 text-left">{p.industry}</th>
                <th className="p-3 text-left">{p.activeJobs}</th>
                <th className="p-3 text-left">{p.totalSpent}</th>
                <th className="p-3 text-left">{p.status}</th>
                <th className="p-3 text-left">{p.since}</th>
                <th className="p-3 text-right">{p.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                    No clients yet.
                  </td>
                </tr>
              ) : (
                pageData.map((client) => (
                  <tr key={client.id} className="text-gray-700 hover:bg-gray-50">
                    <td className="p-3 font-semibold">{client.id}</td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-[10px] text-gray-500">{client.email}</p>
                    </td>
                    <td className="p-3">{client.industry}</td>
                    <td className="p-3">{client.activeJobs}</td>
                    <td className="p-3 font-semibold">{client.totalSpent}</td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[client.status] ?? ""}`}
                      >
                        {client.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{client.since}</td>
                    <td className="p-3 text-right">
                      <Link
                        href="/business/messages"
                        className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" /> {p.contact}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <DashboardTablePagination
          current={page}
          total={totalPages}
          pageSize={PAGE_SIZE}
          totalItems={filtered.length}
          onChange={setPage}
        />
      </div>

      <p className="text-xs text-gray-500">
        {p.manageServices}{" "}
        <Link href="/business/services" className="text-primary font-semibold hover:underline">
          {t.business.sidebar.services}
        </Link>
      </p>

      {addOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
          <button
            type="button"
            className="fixed inset-0 -z-10"
            aria-label="Close"
            onClick={() => setAddOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">{p.addClient}</h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {(["name", "email", "industry"] as const).map((field) => (
              <div key={field}>
                <label className="mb-1.5 block text-xs sm:text-sm font-medium text-muted-foreground capitalize">
                  {field}
                </label>
                <input
                  value={newClient[field]}
                  onChange={(e) => setNewClient((v) => ({ ...v, [field]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  placeholder={`Client ${field}`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                if (!newClient.name || !newClient.email) {
                  toast.error("Name and email are required.");
                  return;
                }
                setAddedClients((prev) => [
                  {
                    id: `CLT-${String(demoClients.length + prev.length + 1).padStart(3, "0")}`,
                    name: newClient.name,
                    email: newClient.email,
                    industry: newClient.industry || "General",
                    activeJobs: 0,
                    totalSpent: "$0",
                    status: "Active",
                    since: new Date().toISOString().slice(0, 7).replace("-", "/"),
                  },
                  ...prev,
                ]);
                setNewClient({ name: "", email: "", industry: "" });
                setAddOpen(false);
                toast.success("Client added successfully.");
              }}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
            >
              Save Client
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
