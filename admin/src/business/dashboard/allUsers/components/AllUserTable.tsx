"use client"

import React, { useEffect, useState } from "react"
import UsersToolbar from "./UsersToolbar"
import { Pagination } from "@/src/shared/ui/ui/pagination"
import { useRouter } from "next/navigation"
import { Table } from "@/src/shared/ui/table/Table"
import { TableHeading } from "@/src/shared/ui/table/TableHeading"
import { TableRow } from "@/src/shared/ui/table/TableRow"
import { TableColumn } from "@/src/shared/ui/table/TableColumn"
import { Loader2, Eye, Search } from "lucide-react"
import { UserActionModal } from "./UserActionModal"
import { useAppSelector } from "@/src/core/store/hooks"
import { toast } from "sonner"

type BackendUser = {
    userId: string
    accountType?: string
    fullName?: string
    email?: string
    phone?: string | null
    currency?: string
    status?: string
    createdAt?: string
    totalProject?: number
    totalAmount?: number
    paidAmount?: number
    dueAmount?: number
    refundAmount?: number
    profit?: number
}

// ---------------------------------------------------------
// DUMMY DATA: Replaces the failing backend axios call
// ---------------------------------------------------------
const dummyUsersData: BackendUser[] = [
  { userId: "1", fullName: "Emma Thompson", email: "emma.t@example.com", currency: "USD", status: "active", createdAt: "2026-06-15T10:30:00Z" },
  { userId: "2", fullName: "Liam O'Connor", email: "liam.oc@example.com", currency: "EUR", status: "pending", createdAt: "2026-06-18T14:20:00Z" },
  { userId: "3", fullName: "Sophia Martinez", email: "smartinez@example.com", currency: "USD", status: "active", createdAt: "2026-06-20T09:15:00Z" },
  { userId: "4", fullName: "Noah Williams", email: "noah.w@example.com", currency: "GBP", status: "suspend", createdAt: "2026-06-22T16:45:00Z" },
  { userId: "5", fullName: "Olivia Chen", email: "olivia.chen@example.com", currency: "JPY", status: "active", createdAt: "2026-06-25T11:10:00Z" },
  { userId: "6", fullName: "William Davis", email: "will.davis@example.com", currency: "USD", status: "dormant", createdAt: "2026-06-28T08:05:00Z" },
  { userId: "7", fullName: "Ava Taylor", email: "ava.t@example.com", currency: "EUR", status: "active", createdAt: "2026-07-01T13:40:00Z" },
  { userId: "8", fullName: "James Anderson", email: "j.anderson@example.com", currency: "GBP", status: "pending", createdAt: "2026-07-02T15:25:00Z" },
  { userId: "9", fullName: "Isabella Thomas", email: "isa.thomas@example.com", currency: "USD", status: "active", createdAt: "2026-07-03T10:50:00Z" },
  { userId: "10", fullName: "Benjamin Jackson", email: "ben.jackson@example.com", currency: "USD", status: "closed", createdAt: "2026-07-04T09:30:00Z" },
  { userId: "11", fullName: "Mia White", email: "mia.white@example.com", currency: "EUR", status: "active", createdAt: "2026-07-05T14:15:00Z" },
  { userId: "12", fullName: "Lucas Harris", email: "lucas.h@example.com", currency: "JPY", status: "pending", createdAt: "2026-07-05T16:00:00Z" },
]

const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'active':
            return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        case 'pending':
            return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        case 'suspend':
            return 'bg-red-500/10 text-red-600 border-red-500/20'
        case 'dormant':
            return 'bg-slate-500/10 text-slate-600 border-slate-500/20'
        case 'closed':
            return 'bg-zinc-800/10 text-zinc-600 border-zinc-800/20'
        case 'block':
            return 'bg-rose-600/10 text-rose-600 border-rose-600/20'
        default:
            return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
}

const AllUserTable: React.FC = () => {
    const [query, setQuery] = useState("")
    const [currency, setCurrency] = useState("All Currencies")
    const [status, setStatus] = useState("All Statuses")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const [isFetching, setIsFetching] = useState(false)
    const [pageSize, setPageSize] = useState(10)
    const [items, setItems] = useState<BackendUser[]>([])
    const [totalPages, setTotalPages] = useState(1)
    const [totalResults, setTotalResults] = useState(0)
    const [debouncedQuery, setDebouncedQuery] = useState(query)
    
    // Modal State
    const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    
    const router = useRouter()
    const token = useAppSelector(state => state.auth.token)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query)
        }, 0)
        return () => clearTimeout(handler)
    }, [query])

    useEffect(() => {
        let active = true
        const fetchUsers = async () => {
            setIsFetching(true)
            try {
                const response = await fetch('/admin/api/sso/auth/admin/users?accountType=user', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (!response.ok) throw new Error('Network response was not ok')
                const resData = await response.json()
                
                if (!active) return

                let filtered = (resData.data.users || resData.data || []).map((u: any) => ({
                    userId: u.userId || u.id,
                    fullName: u.fullName || u.email,
                    email: u.email || u.phone,
                    currency: u.currency,
                    status: u.status,
                    createdAt: u.createdAt,
                    totalProject: u.totalProject || 0,
                    totalAmount: u.totalAmount || 0,
                    paidAmount: u.paidAmount || 0,
                    dueAmount: u.dueAmount || 0,
                    refundAmount: u.refundAmount || 0,
                    profit: u.profit || 0
                }))

                // Apply Filters
                if (debouncedQuery) {
                    const q = debouncedQuery.toLowerCase()
                    filtered = filtered.filter((u: BackendUser) => 
                        u.fullName?.toLowerCase().includes(q) || 
                        u.email?.toLowerCase().includes(q)
                    )
                }

                if (status && status !== "All Statuses") {
                    filtered = filtered.filter((u: BackendUser) => u.status?.toLowerCase() === status.toLowerCase())
                }

                if (currency && currency !== "All Currencies") {
                    filtered = filtered.filter((u: BackendUser) => u.currency === currency)
                }

                setTotalResults(filtered.length)
                setTotalPages(Math.max(1, Math.ceil(filtered.length / pageSize)))
                
                // Apply Pagination
                const startIdx = (page - 1) * pageSize
                const paginated = filtered.slice(startIdx, startIdx + pageSize)
                
                setItems(paginated)
            } catch (error) {
                console.error("Failed to fetch users", error)
                if (active) setItems([])
            } finally {
                if (active) setIsFetching(false)
            }
        }
        fetchUsers()
        return () => { active = false }
    }, [page, pageSize, status, debouncedQuery, currency, startDate, endDate, token])

    const handleView = (user: BackendUser) => {
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
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to update");
            }
            
            // Update local state
            setItems(prev => prev.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
            setSelectedUser(prev => prev?.userId === userId ? { ...prev, status: newStatus } : prev);
            toast.success("User status updated successfully");
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
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to delete");
            }
            
            // Update local state
            setItems(prev => prev.filter(u => u.userId !== userId));
            setTotalResults(prev => prev - 1);
            toast.success("User deleted successfully");
        } catch (e: any) {
            toast.error(e.message || "Failed to delete user");
        }
    }

    return (
        <div className="px-4 sm:px-6 pt-2 pb-6 w-full max-w-full overflow-hidden min-h-[70vh]">
            <div className="flex flex-col gap-6 w-full">
                
                <UsersToolbar
                    query={query}
                    onQueryChange={setQuery}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                    status={status}
                    onStatusChange={setStatus}
                    startDate={startDate}
                    onStartDateChange={setStartDate}
                    endDate={endDate}
                    onEndDateChange={setEndDate}
                />

                <Table>
                    <TableHeading>
                        <TableColumn isHeader style={{ width: '8%' }}>User Id</TableColumn>
                        <TableColumn isHeader style={{ width: '10%' }}>Total Project</TableColumn>
                        <TableColumn isHeader style={{ width: '12%' }}>Total Amount</TableColumn>
                        <TableColumn isHeader style={{ width: '12%' }}>Paid Amount</TableColumn>
                        <TableColumn isHeader style={{ width: '12%' }}>Due Amount</TableColumn>
                        <TableColumn isHeader style={{ width: '12%' }}>Refund Amount</TableColumn>
                        <TableColumn isHeader style={{ width: '12%' }}>Profit</TableColumn>
                        <TableColumn isHeader style={{ width: '12%' }}>Status</TableColumn>
                        <TableColumn isHeader align="center" style={{ width: '10%' }}>Action</TableColumn>
                    </TableHeading>
                    <tbody>
                        {isFetching ? (
                            <TableRow>
                                <TableColumn colSpan={9}>
                                    <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                        <span className="text-gray-500 font-medium">Fetching users...</span>
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
                                        <h3 className="text-base font-bold text-gray-700">No users found</h3>
                                        <p className="text-gray-500 text-sm">Try adjusting your search or filters.</p>
                                    </div>
                                </TableColumn>
                            </TableRow>
                        ) : (
                            items.map((u, idx) => (
                                <TableRow key={u.userId}>
                                    <TableColumn>
                                        #{(u.userId || '').slice(0,5)}
                                    </TableColumn>
                                    <TableColumn>
                                        {u.totalProject || 0}
                                    </TableColumn>
                                    <TableColumn>
                                        {u.totalAmount || 0} {u.currency || 'USD'}
                                    </TableColumn>
                                    <TableColumn>
                                        {u.paidAmount || 0} {u.currency || 'USD'}
                                    </TableColumn>
                                    <TableColumn>
                                        {u.dueAmount || 0} {u.currency || 'USD'}
                                    </TableColumn>
                                    <TableColumn>
                                        {u.refundAmount ? `${u.refundAmount} ${u.currency || 'USD'}` : '..........'}
                                    </TableColumn>
                                    <TableColumn>
                                        {u.profit || 0} {u.currency || 'USD'}
                                    </TableColumn>
                                    <TableColumn>
                                        <span className={`px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-sm ${getStatusColor(u.status || '')}`}>
                                            {(u.status || 'UNKNOWN').toUpperCase()}
                                        </span>
                                    </TableColumn>
                                    <TableColumn align="center">
                                        <button
                                            onClick={() => handleView(u)}
                                            className="inline-flex items-center justify-center p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                                            title="View User"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </TableColumn>
                                </TableRow>
                            ))
                        )}
                    </tbody>
                </Table>
                
                {/* Pagination Footer */}
                <div className="mt-4 w-full">
                        <Pagination 
                            currentPage={page} 
                            totalPages={totalPages} 
                            onPageChange={(p) => setPage(p)} 
                            pageSize={pageSize} 
                            totalResults={totalResults}
                            onPageSizeChange={(size) => setPageSize(size)}
                        />
                </div>

            </div>

            {/* Action Modal */}
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

export default AllUserTable