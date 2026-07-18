"use client"

import React, { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Search } from "lucide-react"
import { SearchInput } from "@/src/shared/ui/form/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/ui/select"
import { Table } from "@/src/shared/ui/table/Table"
import { TableHeading } from "@/src/shared/ui/table/TableHeading"
import { TableColumn } from "@/src/shared/ui/table/TableColumn"
import { TableRow } from "@/src/shared/ui/table/TableRow"
import { Pagination } from "@/src/shared/ui/ui/pagination"
import { Loader2 } from "lucide-react"
import { UserActionModal } from "../../allUsers/components/UserActionModal"
import { useAppSelector } from "@/src/core/store/hooks"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────
type BusinessStatus = "ACTIVE" | "PENDING" | "SUSPEND" | "BLOCK" | "DORMANT" | "CLOSED" | "INACTIVE"

interface BusinessRow {
  id: string
  businessId: string
  businessName: string
  businessType: string
  securityDeposit: string
  dueAmount: string
  percentageRate: string
  paidAmount: string
  country: string
  status: BusinessStatus
}

// ── Status Badge ───────────────────────────────────────────────────────────
function getStatusStyle(status: BusinessStatus) {
  switch (status) {
    case "ACTIVE":   return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "PENDING":  return "bg-amber-100 text-amber-700 border-amber-200"
    case "SUSPEND":  return "bg-orange-100 text-orange-700 border-orange-200"
    case "BLOCK":    return "bg-red-100 text-red-700 border-red-200"
    case "DORMANT":  return "bg-slate-100 text-slate-600 border-slate-200"
    case "CLOSED":   return "bg-zinc-100 text-zinc-700 border-zinc-200"
    case "INACTIVE": return "bg-gray-100 text-gray-500 border-gray-200"
    default:         return "bg-gray-100 text-gray-500 border-gray-200"
  }
}

// ── Main Component ─────────────────────────────────────────────────────────
const AllBusinessTable: React.FC = () => {
  const router = useRouter()
  const [query, setQuery]               = useState("")
  const [country, setCountry]           = useState("All Countries")
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All Business")
  const [status, setStatus]             = useState("All Statuses")
  const [startDate, setStartDate]       = useState("")
  const [endDate, setEndDate]           = useState("")
  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(10)
  
  const [items, setItems] = useState<any[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState(query)
  const token = useAppSelector(state => state.auth.token)

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(handler)
  }, [query])

  React.useEffect(() => {
    let active = true
    const fetchBusinesses = async () => {
      setIsFetching(true)
      try {
        const response = await fetch('/admin/api/sso/auth/admin/users?accountType=business', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const resData = await response.json()
        
        if (!active) return

        let filtered = (resData.data.users || resData.data || []).map((u: any) => ({
          userId: u.userId || u.id,
          businessId: (u.userId || u.id || '').slice(0,5),
          fullName: u.businessName || u.fullName || 'Unknown Business',
          email: u.email || '-',
          businessName: u.businessName || u.fullName || 'Unknown Business',
          businessType: u.businessType || 'NA',
          createdAt: u.createdAt,
          securityDeposit: `${u.securityDeposit || 0} ${u.currency || 'USD'}`,
          dueAmount: `${u.dueAmount || 0} ${u.currency || 'USD'}`,
          percentageRate: `${u.percentageRate || 0}%`,
          paidAmount: `${u.paidAmount || 0} ${u.currency || 'USD'}`,
          status: (u.status || 'ACTIVE').toUpperCase()
        }))

        const q = debouncedQuery.toLowerCase()
        if (q) {
          filtered = filtered.filter((b: any) => 
            b.businessId.toLowerCase().includes(q) ||
            b.businessName.toLowerCase().includes(q)
          )
        }
        if (status !== "All Statuses") {
          filtered = filtered.filter((b: any) => b.status === status)
        }
        if (businessTypeFilter !== "All Business") {
           filtered = filtered.filter((b: any) => b.businessType === businessTypeFilter)
        }

        setTotalResults(filtered.length)
        setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)))
        const startIdx = (page - 1) * pageSize
        setItems(filtered.slice(startIdx, startIdx + pageSize))
      } catch (err) {
        console.error(err)
        if (active) setItems([])
      } finally {
        if (active) setIsFetching(false)
      }
    }
    fetchBusinesses()
    return () => { active = false }
  }, [page, pageSize, status, debouncedQuery, businessTypeFilter, token])

  const handleView = (user: any) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    try {
      const res = await fetch(`/admin/api/sso/auth/admin/users/${userId}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update");
      setItems(prev => prev.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
      toast.success("Business status updated successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      const res = await fetch(`/admin/api/sso/auth/admin/users/${userId}`, { 
          method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete");
      setItems(prev => prev.filter(u => u.userId !== userId));
      setTotalResults(prev => prev - 1);
      toast.success("Business deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user");
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-2 pb-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full overflow-x-auto custom-scrollbar">
          <div className="w-64 sm:w-72 flex-shrink-0">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search businesses by name, ID or type..."
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto flex-shrink-0">
            {/* Country */}
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-[140px] shadow-sm">
                <SelectValue placeholder="All Countries" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 rounded-md shadow-lg z-[100]">
                <SelectItem value="All Countries" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Countries</SelectItem>
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Japan">Japan</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-[130px]"
              />
              <span className="text-slate-400 font-medium">To</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-[130px]"
              />
            </div>

            {/* Business Type */}
            <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
              <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-[140px] shadow-sm">
                <SelectValue placeholder="All Business" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 rounded-md shadow-lg z-[100]">
                <SelectItem value="All Business" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Business</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Visa & Travel">Visa & Travel</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-[140px] shadow-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 rounded-md shadow-lg z-[100]">
                <SelectItem value="All Statuses" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="SUSPEND">SUSPEND</SelectItem>
                <SelectItem value="BLOCK">BLOCK</SelectItem>
                <SelectItem value="DORMANT">DORMANT</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Table ── */}
        <Table>
          <TableHeading>
            <TableColumn isHeader style={{ width: '10%'  }}>Business ID</TableColumn>
            <TableColumn isHeader style={{ width: '16%'  }}>Business Name</TableColumn>
            <TableColumn isHeader style={{ width: '16%'  }}>Business Type</TableColumn>
            <TableColumn isHeader style={{ width: '12%'  }}>Security Deposit</TableColumn>
            <TableColumn isHeader style={{ width: '12%'  }}>Due Amount</TableColumn>
            <TableColumn isHeader style={{ width: '10%'  }}>Percentage Rate</TableColumn>
            <TableColumn isHeader style={{ width: '10%'  }}>Paid Amount</TableColumn>
            <TableColumn isHeader style={{ width: '8%'   }}>Status</TableColumn>
            <TableColumn isHeader style={{ width: '6%'   }} align="center">Action</TableColumn>
          </TableHeading>
          <tbody>
            {isFetching ? (
                <TableRow>
                    <TableColumn colSpan={9}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="text-gray-500 font-medium">Fetching businesses...</span>
                        </div>
                    </TableColumn>
                </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableColumn colSpan={9}>
                  <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700">No businesses found</h3>
                    <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
                  </div>
                </TableColumn>
              </TableRow>
            ) : (
              items.map((b) => (
                <TableRow key={b.userId}>
                  {/* Business ID */}
                  <TableColumn>
                    <span className="font-mono text-sm font-semibold text-blue-600">#{b.businessId}</span>
                  </TableColumn>

                  {/* Business Name */}
                  <TableColumn>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">{b.businessName}</span>
                  </TableColumn>

                  {/* Business Type */}
                  <TableColumn>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{b.businessType}</span>
                  </TableColumn>

                  {/* Security Deposit */}
                  <TableColumn>
                    <span className="font-semibold text-slate-700">{b.securityDeposit}</span>
                  </TableColumn>

                  {/* Due Amount */}
                  <TableColumn>
                    <span className="font-semibold text-slate-700">{b.dueAmount}</span>
                  </TableColumn>

                  {/* Percentage Rate */}
                  <TableColumn>
                    <span className="text-sm font-semibold text-slate-600">{b.percentageRate}</span>
                  </TableColumn>

                  {/* Paid Amount */}
                  <TableColumn>
                    <span className="font-semibold text-emerald-700">{b.paidAmount}</span>
                  </TableColumn>

                  {/* Status */}
                  <TableColumn>
                    <span className={`px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-sm border ${getStatusStyle(b.status)}`}>
                      {b.status}
                    </span>
                  </TableColumn>

                  {/* Action */}
                  <TableColumn align="center">
                    <button
                      onClick={() => handleView(b)}
                      className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                      title="View Business"
                    >
                      <Eye size={18} strokeWidth={2.5} />
                    </button>
                  </TableColumn>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>

        {/* ── Pagination ── */}
        <div className="mt-2 w-full">
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

      <UserActionModal 
          isOpen={isModalOpen} 
          user={selectedUser} 
          onClose={() => setIsModalOpen(false)} 
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
      />
    </div>
  )
}

export default AllBusinessTable