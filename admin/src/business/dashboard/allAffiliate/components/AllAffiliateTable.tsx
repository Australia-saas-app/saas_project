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
import { logAdminActivity } from "@/src/shared/lib/admin-activity-logger"

// ── Types ──────────────────────────────────────────────────────────────────
type AffiliateStatus = string

interface AffiliateRow {
  id: string
  affiliateId: string
  fullName: string
  email: string
  industryType: string
  totalConversions: number
  totalReferrals: number
  commissionRate: string
  earningsAmount: string
  level: number
  country: string
  status: AffiliateStatus
}

// ── Status Badge ───────────────────────────────────────────────────────────
function getStatusStyle(status: string) {
  const norm = String(status || '').toUpperCase().trim().replace(/[\s-]+/g, '_');
  switch (norm) {
    case "ACTIVE":       return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "PENDING":      return "bg-amber-100 text-amber-700 border-amber-200"
    case "UNDER_REVIEW": return "bg-indigo-100 text-indigo-700 border-indigo-200"
    case "SUSPENDED":
    case "SUSPEND":      return "bg-orange-100 text-orange-700 border-orange-200"
    case "BLOCKED":
    case "BLOCK":        return "bg-rose-100 text-rose-700 border-rose-200"
    case "DORMANT":      return "bg-slate-100 text-slate-600 border-slate-200"
    case "DEACTIVATED":  return "bg-zinc-100 text-zinc-700 border-zinc-300"
    case "CLOSED":       return "bg-zinc-200 text-zinc-700 border-zinc-300"
    case "INACTIVE":     return "bg-gray-100 text-gray-500 border-gray-200"
    default:             return "bg-gray-100 text-gray-500 border-gray-200"
  }
}

// ── Main Component ─────────────────────────────────────────────────────────
const AllAffiliateTable: React.FC = () => {
  const router = useRouter()
  const [query, setQuery]               = useState("")
  const [country, setCountry]           = useState("All Countries")
  const [industryType, setIndustryType] = useState("All Industries")
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
  const adminUser = useAppSelector((state: any) => state.auth.user)

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(handler)
  }, [query])

  React.useEffect(() => {
    let active = true
    const fetchAffiliates = async () => {
      setIsFetching(true)
      try {
        const response = await fetch('/admin/api/sso/auth/admin/users?accountType=affiliate', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Failed to fetch')
        const resData = await response.json()
        
        if (!active) return

        let filtered = (resData.data.users || resData.data || []).map((u: any) => ({
          userId: u.userId || u.id,
          affiliateId: u.userId || (u.id || '').slice(0,5),
          accountType: u.accountType || 'affiliate',
          fullName: u.fullName || 'Unknown',
          email: u.email,
          phone: u.phone,
          industryType: u.industryType || 'NA',
          createdAt: u.createdAt,
          nationality: u.nationality,
          dateOfBirth: u.dateOfBirth,
          governmentId: u.governmentId || u.nationalIdentity,
          idDocument: u.idDocument || u.documentUrl,
          totalConversions: u.conversions || 0,
          totalReferrals: u.referrals || 0,
          commissionRate: `${u.commission || 0}%`,
          earningsAmount: `${u.earnings || 0} ${u.currency || 'USD'}`,
          level: u.level || 1,
          status: (u.status || 'ACTIVE').toUpperCase(),
          kycStatus: u.kycStatus
        }))

        const q = debouncedQuery.toLowerCase()
        if (q) {
          filtered = filtered.filter((a: any) => 
            a.affiliateId.toLowerCase().includes(q) ||
            a.fullName.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q)
          )
        }
        if (status !== "All Statuses") {
          const filterNorm = status.toUpperCase().replace(/[\s-]+/g, '_');
          filtered = filtered.filter((a: any) => {
            const aNorm = String(a.status || '').toUpperCase().replace(/[\s-]+/g, '_');
            if (filterNorm === 'SUSPENDED' && (aNorm === 'SUSPEND' || aNorm === 'SUSPENDED')) return true;
            if (filterNorm === 'BLOCKED' && (aNorm === 'BLOCK' || aNorm === 'BLOCKED')) return true;
            if (filterNorm === 'DEACTIVATED' && (aNorm === 'DEACTIVATE' || aNorm === 'DEACTIVATED')) return true;
            return aNorm === filterNorm;
          });
        }
        if (industryType !== "All Industries") {
           filtered = filtered.filter((a: any) => a.industryType === industryType)
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
    fetchAffiliates()
    return () => { active = false }
  }, [page, pageSize, status, debouncedQuery, industryType, token])

  const handleView = (user: any) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  const handleStatusUpdate = async (userId: string, newStatus: string, reason?: string, isAdminOverride?: boolean) => {
    try {
      const res = await fetch(`/admin/api/sso/auth/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: newStatus, reason, isAdminOverride })
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData.message || resData.error || "Failed to update");
      setItems(prev => prev.map(u => u.userId === userId ? { ...u, status: newStatus } : u));

      const lowerStatus = newStatus.toLowerCase();
      window.dispatchEvent(new CustomEvent("vero:user_status_updated", { detail: { userId, status: lowerStatus } }));
      window.dispatchEvent(new CustomEvent("vero:account_changed", { detail: { userId, status: lowerStatus } }));

      // Log admin action with real IP — admin email in details only
      logAdminActivity(token || "", {
        action: 'ACCOUNT_STATUS_CHANGED',
        resource: `Affiliate account status updated to ${newStatus} by administrator`,
        targetUserId: userId,
        targetUserEmail: selectedUser?.email,
        targetUserName: selectedUser?.fullName,
        adminEmail: adminUser?.email,
        adminName: adminUser?.fullName || adminUser?.name,
        extra: { newStatus },
      });

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:account_changed", userId, status: lowerStatus });
          bc.close();
        }
      } catch {}
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
      
      // Delete user logs as well
      await fetch(`/admin/api/user-profile-service/activity/admin/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(e => console.error("Failed to delete user logs:", e));

      setItems(prev => prev.filter(u => u.userId !== userId));
      setTotalResults(prev => prev - 1);
      toast.success("Affiliate account permanently deleted.");

      // Notify KYC queue and other pages to remove this user
      window.dispatchEvent(new CustomEvent("vero:user_deleted", { detail: { userId } }));
      window.dispatchEvent(new CustomEvent("vero:account_changed", { detail: { userId } }));

      try {
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({ type: "vero:account_changed", userId });
          bc.close();
        }
      } catch {}
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
              placeholder="Search affiliates by name, ID or industry..."
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

            {/* Industry */}
            <Select value={industryType} onValueChange={setIndustryType}>
              <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-[150px] shadow-sm">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 rounded-md shadow-lg z-[100]">
                <SelectItem value="All Industries" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Industries</SelectItem>
                <SelectItem value="Technology, Construction">Technology, Construction</SelectItem>
                <SelectItem value="Retail, Import & Export">Retail, Import & Export</SelectItem>
                <SelectItem value="Real Estate">Real Estate</SelectItem>
                <SelectItem value="Visa & Travel">Visa & Travel</SelectItem>
                <SelectItem value="Finance & Banking">Finance & Banking</SelectItem>
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
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="DORMANT">Dormant</SelectItem>
                <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Table ── */}
        <Table>
          <TableHeading>
            <TableColumn isHeader style={{ width: '10%'  }}>Affiliate ID</TableColumn>
            <TableColumn isHeader style={{ width: '18%'  }}>Affiliate</TableColumn>
            <TableColumn isHeader style={{ width: '16%'  }}>Industry Type</TableColumn>
            <TableColumn isHeader style={{ width: '8%'   }}>Conversions</TableColumn>
            <TableColumn isHeader style={{ width: '8%'   }}>Referrals</TableColumn>
            <TableColumn isHeader style={{ width: '8%'   }}>Commission</TableColumn>
            <TableColumn isHeader style={{ width: '10%'  }}>Earnings</TableColumn>
            <TableColumn isHeader style={{ width: '6%'   }} align="center">Level</TableColumn>
            <TableColumn isHeader style={{ width: '10%'  }}>Status</TableColumn>
            <TableColumn isHeader style={{ width: '6%'   }} align="center">Action</TableColumn>
          </TableHeading>
          <tbody>
            {isFetching ? (
                <TableRow>
                    <TableColumn colSpan={10}>
                        <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="text-gray-500 font-medium">Fetching affiliates...</span>
                        </div>
                    </TableColumn>
                </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableColumn colSpan={10}>
                  <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700">No affiliates found</h3>
                    <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
                  </div>
                </TableColumn>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.userId}>
                  {/* Affiliate ID */}
                  <TableColumn>
                    <span className="font-mono text-sm font-semibold text-blue-600">
                      {a.affiliateId && (a.affiliateId.startsWith("AFF-") || a.affiliateId.startsWith("USR-") || a.affiliateId.startsWith("BSN-"))
                        ? a.affiliateId
                        : `AFF-${(parseInt((a.affiliateId || '').replace(/\D/g, '').slice(-4), 10) || 1) < 10 ? `0${parseInt((a.affiliateId || '').replace(/\D/g, '').slice(-4), 10) || 1}` : parseInt((a.affiliateId || '').replace(/\D/g, '').slice(-4), 10) || 1}`}
                    </span>
                  </TableColumn>

                  {/* Affiliate name + email */}
                  <TableColumn>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {a.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{a.fullName}</div>
                        <div className="text-xs text-gray-500 truncate">{a.email}</div>
                      </div>
                    </div>
                  </TableColumn>

                  {/* Industry */}
                  <TableColumn>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{a.industryType}</span>
                  </TableColumn>

                  {/* Conversions */}
                  <TableColumn align="center">
                    <span className="font-semibold text-slate-700">{a.totalConversions}</span>
                  </TableColumn>

                  {/* Referrals */}
                  <TableColumn align="center">
                    <span className="font-semibold text-slate-700">{a.totalReferrals}</span>
                  </TableColumn>

                  {/* Commission Rate */}
                  <TableColumn align="center">
                    <span className="text-sm font-semibold text-slate-600">{a.commissionRate}</span>
                  </TableColumn>

                  {/* Earnings */}
                  <TableColumn>
                    <span className="font-semibold text-emerald-700">{a.earningsAmount}</span>
                  </TableColumn>

                  {/* Level */}
                  <TableColumn align="center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                      {a.level}
                    </span>
                  </TableColumn>

                  {/* Status */}
                  <TableColumn>
                    <span className={`whitespace-nowrap px-2.5 py-1 text-[11px] tracking-wider font-bold rounded-sm border ${getStatusStyle(a.status)}`}>
                      {a.status}
                    </span>
                  </TableColumn>

                  {/* Action */}
                  <TableColumn align="center">
                    <button
                      onClick={() => handleView(a)}
                      className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                      title="View Affiliate"
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

export default AllAffiliateTable