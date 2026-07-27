"use client"

import React, { useState, useEffect, useMemo } from "react"
import PageHeader from '@/src/shared/ui/ui/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/ui/ui/select'
import { Pagination } from "@/src/shared/ui/ui/pagination"
import { SearchInput } from "@/src/shared/ui/form/search-input"
import { MessageSquare, Eye, CheckCircle, X, ShieldCheck, DollarSign, Layers, Calendar, Check, Briefcase } from "lucide-react"
import { Table } from "@/src/shared/ui/table/Table"
import { TableHeading } from "@/src/shared/ui/table/TableHeading"
import { TableRow } from "@/src/shared/ui/table/TableRow"
import { TableColumn } from "@/src/shared/ui/table/TableColumn"
import { Button } from "@/src/shared/ui/ui/button"

export interface TechnicalServiceRecord {
  id: string
  category: string
  client: string
  budget: string
  deadline: string
  status: "Active" | "Pending" | "Completed" | "On Hold" | "Rejected" | "ACTIVE" | "PENDING"
  title?: string
  summary?: string
  subCategory?: string
  skills?: string[]
  deliverables?: string[]
  coverUrl?: string
}

const STORAGE_KEY = "business_service_rows"

const getStatusColor = (status: string) => {
  const norm = status?.toUpperCase()
  switch (norm) {
    case 'ACTIVE':
    case 'COMPLETE':
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
    case 'PENDING':
    case 'WAITING':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
    case 'REJECTED':
    case 'ON HOLD':
      return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const TechnicalProjectLayout: React.FC = () => {
  const [services, setServices] = useState<TechnicalServiceRecord[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "ACTIVE">("ALL")
  const [selectedService, setSelectedService] = useState<TechnicalServiceRecord | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Load real services from storage
  const loadServices = () => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as TechnicalServiceRecord[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServices(parsed.filter((s) => s.category === "Technical" || !s.category || s.subCategory))
          return
        }
      }
    } catch (e) {
      console.error(e)
    }

    // Seed default technical services if empty
    const seed: TechnicalServiceRecord[] = [
      {
        id: "SRV-1001",
        category: "Technical",
        client: "Nova Tech Solutions",
        budget: "$2,500",
        deadline: "14 Days",
        status: "Pending",
        title: "Full-Stack Next.js 14 & NestJS Enterprise Web Application",
        summary: "Complete web app development using Next.js App Router, TypeScript, and NestJS microservices.",
        subCategory: "Web Development",
        skills: ["Next.js", "TypeScript", "NestJS", "PostgreSQL", "TailwindCSS"],
        deliverables: ["Source Code Repository", "CI/CD Pipeline", "API Documentation", "Deployment Setup"],
        coverUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "SRV-1002",
        category: "Technical",
        client: "Acme Cloud Inc",
        budget: "$3,800",
        deadline: "21 Days",
        status: "Active",
        title: "Kubernetes Cloud Infrastructure & DevOps Pipeline",
        summary: "Automated AWS EKS cluster deployment with Helm charts and Prometheus monitoring.",
        subCategory: "Cloud & DevOps",
        skills: ["Docker", "Kubernetes", "AWS", "Terraform", "Prometheus"],
        deliverables: ["Infrastructure as Code", "Prometheus Dashboard", "Security Audit Report"],
        coverUrl: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=800&q=80",
      },
    ]
    setServices(seed)
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleApproveService = (id: string) => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const allRows: TechnicalServiceRecord[] = raw ? JSON.parse(raw) : services
      const updated = allRows.map((s) => (s.id === id ? { ...s, status: "Active" as const } : s))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setServices(updated.filter((s) => s.category === "Technical" || !s.category || s.subCategory))
      if (selectedService?.id === id) {
        setSelectedService({ ...selectedService, status: "Active" })
      }
      alert(`Service ${id} has been Approved & Published to the Marketplace!`)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRejectService = (id: string) => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const allRows: TechnicalServiceRecord[] = raw ? JSON.parse(raw) : services
      const updated = allRows.map((s) => (s.id === id ? { ...s, status: "Rejected" as const } : s))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setServices(updated.filter((s) => s.category === "Technical" || !s.category || s.subCategory))
      if (selectedService?.id === id) {
        setSelectedService({ ...selectedService, status: "Rejected" })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((s) => {
      const normStatus = s.status?.toUpperCase()
      if (activeTab === "PENDING" && normStatus !== "PENDING") return false
      if (activeTab === "ACTIVE" && normStatus !== "ACTIVE" && normStatus !== "COMPLETED") return false
      if (!q) return true
      return (
        s.id.toLowerCase().includes(q) ||
        s.client.toLowerCase().includes(q) ||
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.subCategory && s.subCategory.toLowerCase().includes(q))
      )
    })
  }, [services, activeTab, search])

  const totalResults = filteredServices.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const paginatedProjects = filteredServices.slice((page - 1) * pageSize, page * pageSize)

  const tabClass = (active: boolean) => active 
    ? "px-5 py-2 rounded-lg font-bold text-sm bg-blue-600 text-white shadow-sm transition-colors"
    : "px-5 py-2 rounded-lg font-bold text-sm bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        
        {/* Header */}
        <div>
          <PageHeader title="Technical Services & Listings Management" />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
          
          {/* Left side: Search */}
          <div className="w-full 2xl:w-64 flex-shrink-0">
            <SearchInput 
              value={search}
              onChange={setSearch}
              placeholder="Search technical services..." 
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Total Listed Services: <strong className="text-slate-900 dark:text-white">{services.length}</strong></span>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setActiveTab("ALL"); setPage(1); }} className={tabClass(activeTab === "ALL")}>
            All Services ({services.length})
          </button>
          <button onClick={() => { setActiveTab("PENDING"); setPage(1); }} className={tabClass(activeTab === "PENDING")}>
            Pending Approval ({services.filter((s) => s.status?.toUpperCase() === "PENDING").length})
          </button>
          <button onClick={() => { setActiveTab("ACTIVE"); setPage(1); }} className={tabClass(activeTab === "ACTIVE")}>
            Active / Approved ({services.filter((s) => s.status?.toUpperCase() === "ACTIVE" || s.status?.toUpperCase() === "COMPLETED").length})
          </button>
        </div>

        {/* Data Table */}
        <div className="mt-2 w-full overflow-x-auto">
          <div className="min-w-[1000px]">
            <Table>
              <TableHeading>
                <TableColumn isHeader align="center" className="font-bold">Service ID</TableColumn>
                <TableColumn isHeader align="center" className="font-bold">Title & Subcategory</TableColumn>
                <TableColumn isHeader align="center" className="font-bold">Business Provider</TableColumn>
                <TableColumn isHeader align="center" className="font-bold">Budget</TableColumn>
                <TableColumn isHeader align="center" className="font-bold">Target Timeline</TableColumn>
                <TableColumn isHeader align="center" className="font-bold">Status</TableColumn>
                <TableColumn isHeader align="center" className="font-bold">Actions (Inspect & Approve)</TableColumn>
              </TableHeading>
              <tbody>
                {paginatedProjects.length === 0 ? (
                  <TableRow>
                    <TableColumn colSpan={7}>
                      <div className="flex flex-col items-center justify-center gap-3 py-10">
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No technical services found</h3>
                      </div>
                    </TableColumn>
                  </TableRow>
                ) : (
                  paginatedProjects.map((p) => (
                    <TableRow key={p.id}>
                      <TableColumn align="center" className="font-semibold text-slate-700 dark:text-slate-200">{p.id}</TableColumn>
                      <TableColumn align="center">
                        <div className="flex flex-col items-center text-center">
                          <span className="font-bold text-slate-900 dark:text-white max-w-[240px] truncate">{p.title || p.id}</span>
                          <span className="text-xs text-blue-600 font-semibold">{p.subCategory || p.category}</span>
                        </div>
                      </TableColumn>
                      <TableColumn align="center" className="font-semibold text-slate-800 dark:text-slate-200">{p.client}</TableColumn>
                      <TableColumn align="center" className="font-bold text-emerald-600 dark:text-emerald-400">{p.budget}</TableColumn>
                      <TableColumn align="center" className="text-xs font-semibold text-slate-600 dark:text-slate-300">{p.deadline}</TableColumn>
                      <TableColumn align="center">
                        <span className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md border ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </TableColumn>
                      <TableColumn align="center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Inspect & Approve Service"
                            onClick={() => {
                              setSelectedService(p)
                              setModalOpen(true)
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Eye size={18} />
                          </Button>
                          {p.status?.toUpperCase() === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveService(p.id)}
                              className="h-8 px-2 text-xs font-bold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              <CheckCircle size={14} className="mr-1" /> Approve
                            </Button>
                          )}
                        </div>
                      </TableColumn>
                    </TableRow>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="mt-4 flex justify-end">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            totalResults={totalResults}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      </div>

      {/* Admin Eye Icon Inspection & Verification Modal */}
      {modalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="h-4 w-4" /> Technical Service Verification
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedService.title || selectedService.id}
                </h2>
                <p className="text-xs text-slate-500">Service ID: {selectedService.id} • Category: {selectedService.subCategory || "Technical"}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Cover Banner */}
              {selectedService.coverUrl && (
                <div className="h-40 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  <img src={selectedService.coverUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}

              {/* Status & Business Provider */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 text-xs">
                <div>
                  <span className="text-slate-500 block">Business Provider:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedService.client}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Verification Status:</span>
                  <span className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold border ${getStatusColor(selectedService.status)}`}>
                    {selectedService.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pricing / Budget:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedService.budget}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Target Timeline:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedService.deadline}</span>
                </div>
              </div>

              {/* Summary */}
              {selectedService.summary && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Service Description & Scope:</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {selectedService.summary}
                  </p>
                </div>
              )}

              {/* Tech Stack Pills */}
              {selectedService.skills && selectedService.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-500" /> Tech Stack Skills:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedService.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1 text-xs font-bold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {selectedService.deliverables && selectedService.deliverables.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Promised Deliverables:
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {selectedService.deliverables.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Action Controls */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              {selectedService.status?.toUpperCase() !== "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => {
                    handleApproveService(selectedService.id)
                    setModalOpen(false)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-md transition-all"
                >
                  <ShieldCheck className="h-4 w-4" /> Approve & Publish Service
                </button>
              )}
              {selectedService.status?.toUpperCase() !== "REJECTED" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRejectService(selectedService.id)
                    setModalOpen(false)
                  }}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
                >
                  Reject Service
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TechnicalProjectLayout