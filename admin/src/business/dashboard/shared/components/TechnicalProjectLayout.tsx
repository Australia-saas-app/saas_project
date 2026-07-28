"use client"

import React, { useState, useEffect, useMemo } from "react"
import PageHeader from '@/src/shared/ui/ui/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/ui/ui/select'
import { Pagination } from "@/src/shared/ui/ui/pagination"
import { SearchInput } from "@/src/shared/ui/form/search-input"
import { MessageSquare, Eye, X, Layers } from "lucide-react"
import { Table } from "@/src/shared/ui/table/Table"
import { TableHeading } from "@/src/shared/ui/table/TableHeading"
import { TableRow } from "@/src/shared/ui/table/TableRow"
import { TableColumn } from "@/src/shared/ui/table/TableColumn"
import { Button } from "@/src/shared/ui/ui/button"
import { apiClient } from "@/src/infra/api/apiClient"

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
    case 'COMPLETE':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
    case 'PENDING':
    case 'WAITING':
      return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
    case 'REJECTED':
      return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const TechnicalProjectLayout: React.FC = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")
  const [services, setServices] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const loadServices = async () => {
    try {
      const res = await apiClient.get<any>('/technology/services/admin/list');
      const dataList = Array.isArray(res) ? res : (res?.data || []);
      
      const mapped = dataList.map((item: any) => {
        let desc: any = {};
        try { desc = JSON.parse(item.description); } catch(e) {}
        
        return {
          id: item.serviceId,
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
          coverUrl: item.photo || ""
        };
      });
      setServices(mapped);
    } catch (e) {
      console.error(e)
      setServices([])
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleApproveService = async (id: string) => {
    try {
      await apiClient.patch(`/technology/services/${id}/visibility`, { isVisible: true });
      loadServices();
      alert(`Technical service ${id} approved and published successfully.`);
    } catch (e) {
      console.error(e);
      alert("Failed to approve service.");
    }
  }

  const handleRejectService = async (id: string) => {
    try {
      await apiClient.patch(`/technology/services/${id}/visibility`, { isVisible: false });
      // In a real system, you might also have a distinct 'Rejected' status in DB.
      loadServices();
      alert(`Technical service ${id} has been rejected.`);
    } catch (e) {
      console.error(e);
      alert("Failed to reject service.");
    }
  }

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase()
    return services.filter((s) => {
      if (!q) return true
      return (
        s.id.toLowerCase().includes(q) ||
        (s.subCategory && s.subCategory.toLowerCase().includes(q)) ||
        (s.client && s.client.toLowerCase().includes(q)) ||
        (s.title && s.title.toLowerCase().includes(q))
      )
    })
  }, [services, search])

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
          <PageHeader title="Technical" />
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
          
          {/* Left side: Search */}
          <div className="w-full 2xl:w-64 flex-shrink-0">
            <SearchInput 
              value={search}
              onChange={setSearch}
              placeholder="Search projects..." 
              className="w-full"
            />
          </div>

          {/* Right side: Dropdowns */}
          <div className="flex flex-col sm:flex-row flex-wrap 2xl:flex-nowrap items-stretch sm:items-center gap-2.5 w-full 2xl:w-auto 2xl:ml-auto">
            
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[120px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                <SelectValue placeholder="All Country" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Country</SelectItem>
                <SelectItem value="japan" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Japan</SelectItem>
                <SelectItem value="canada" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Canada</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5">
              <input type="date" className="h-10 px-2 w-[125px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer" />
              <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">To</span>
              <input type="date" className="h-10 px-2 w-[125px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer" />
            </div>

            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[130px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                <SelectValue placeholder="All Category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Category</SelectItem>
                <SelectItem value="soft" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Soft dev</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[150px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                <SelectValue placeholder="All Sub Category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Sub Category</SelectItem>
                <SelectItem value="web" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Web dev</SelectItem>
                <SelectItem value="app" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">App dev</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[120px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Status</SelectItem>
                <SelectItem value="pending" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Pending</SelectItem>
                <SelectItem value="payment" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Payment</SelectItem>
                <SelectItem value="waiting" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Waiting</SelectItem>
                <SelectItem value="delayed" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Delayed</SelectItem>
                <SelectItem value="expired" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Expired</SelectItem>
                <SelectItem value="accepted" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Accepted</SelectItem>
                <SelectItem value="in-progress" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">In Progress</SelectItem>
                <SelectItem value="on-hold" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">On Hold</SelectItem>
                <SelectItem value="in-review" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">In Review</SelectItem>
                <SelectItem value="completed" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Completed</SelectItem>
                <SelectItem value="reported" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Reported</SelectItem>
                <SelectItem value="refunded" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Refunded</SelectItem>
                <SelectItem value="cancelled" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Cancelled</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </div>

        {/* Tabs under the filter card */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button className={tabClass(true)}>Project</button>
          <button className={tabClass(false)}>My Project</button>
          <button className={tabClass(false)}>Refund Project</button>
          <button className={tabClass(false)}>Report Project</button>
        </div>

        {/* Data Table */}
        <div className="mt-2 w-full overflow-x-auto">
            <div className="min-w-[1000px]">
              <Table>
                <TableHeading>
                  <TableColumn isHeader align="center" className="font-bold">Order ID</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Sub Category</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Total Amount</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Paid Amount</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Due Amount</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Message</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Duration</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Profits</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Status</TableColumn>
                  <TableColumn isHeader align="center" className="font-bold">Action</TableColumn>
                </TableHeading>
                <tbody>
                  {paginatedProjects.length === 0 ? (
                    <TableRow>
                      <TableColumn colSpan={10}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10">
                          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No projects found</h3>
                        </div>
                      </TableColumn>
                    </TableRow>
                  ) : (
                    paginatedProjects.map((p) => (
                      <TableRow key={p.id}>
                        <TableColumn align="center" className="font-semibold text-slate-700 dark:text-slate-200">{p.id}</TableColumn>
                        <TableColumn align="center" className="text-slate-600 dark:text-slate-300 font-medium">{p.subCategory || "Web dev"}</TableColumn>
                        <TableColumn align="center" className="font-semibold text-slate-800 dark:text-slate-200">{p.totalAmount || p.budget || "0 USD"}</TableColumn>
                        <TableColumn align="center" className="font-semibold text-slate-800 dark:text-slate-200">{p.paidAmount || p.budget || "0 USD"}</TableColumn>
                        <TableColumn align="center" className="font-semibold text-slate-800 dark:text-slate-200">{p.dueAmount || "0 USD"}</TableColumn>
                        <TableColumn align="center">
                          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px] font-bold text-slate-600 border-slate-300 hover:bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800">
                            message <MessageSquare size={13} className="text-slate-500" />
                          </Button>
                        </TableColumn>
                        <TableColumn align="center">
                          <div className="flex flex-col items-center justify-center gap-0.5 text-xs font-semibold">
                            <span className="text-slate-600 dark:text-slate-400">{p.durationStart || "02 Mar 2026"}</span>
                            <span className="text-green-600 dark:text-green-500">{p.durationEnd || p.deadline || "03 Jan 2027"}</span>
                          </div>
                        </TableColumn>
                        <TableColumn align="center" className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.profits || p.budget || "0 USD"}
                        </TableColumn>
                        <TableColumn align="center">
                          <span className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md border ${getStatusColor(p.status)}`}>
                            {p.status || "PENDING"}
                          </span>
                        </TableColumn>
                        <TableColumn align="center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedService(p)
                              setModalOpen(true)
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Eye size={18} />
                          </Button>
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
            onPageChange={(p) => setPage(p)}
            pageSize={pageSize}
            totalResults={totalResults}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        </div>
      </div>

      {/* Beautiful Admin Inspection & Verification Modal */}
      {modalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div 
            style={{ maxWidth: '420px' }}
            className="relative w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in max-h-[75vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                Technical Service Inspection
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Info details */}
            <div className="space-y-3.5 text-sm text-slate-800 dark:text-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-400 block">Service ID</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedService.id}</span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block">Title</span>
                <span className="font-bold">{selectedService.title || "Standard Technical Service Offer"}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Sub Category</span>
                  <span className="font-semibold">{selectedService.subCategory || selectedService.category || "Web Development"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Total Budget</span>
                  <span className="font-bold">{selectedService.budget || selectedService.totalAmount || "0 USD"}</span>
                </div>
              </div>

              {selectedService.summary && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block">Description Summary</span>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
                    {selectedService.summary}
                  </p>
                </div>
              )}

              {selectedService.skills && selectedService.skills.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Required Tech Stack Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedService.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 px-2.5 py-0.5 text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedService.deliverables && selectedService.deliverables.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">Promised Deliverables</span>
                  <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                    {selectedService.deliverables.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer action buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-150 dark:border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-colors"
                >
                  Verify & Publish
                </button>
              )}
              {selectedService.status?.toUpperCase() !== "REJECTED" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRejectService(selectedService.id)
                    setModalOpen(false)
                  }}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition-colors"
                >
                  Reject
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