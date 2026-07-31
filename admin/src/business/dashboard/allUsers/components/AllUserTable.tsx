"use client"

import React, { useEffect, useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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

function clearAllUserStorage(userId: string) {
    if (typeof window === "undefined" || !userId) return;
    try {
        const OVERRIDES_STORAGE_KEY = "user_profile_overrides_v2";
        const DOCUMENTS_STORAGE_KEY = "user_profile_documents_v2";
        
        const rawO = localStorage.getItem(OVERRIDES_STORAGE_KEY);
        if (rawO) {
            const allO = JSON.parse(rawO);
            delete allO[userId];
            localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(allO));
        }
        
        const rawD = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
        if (rawD) {
            const allD = JSON.parse(rawD);
            delete allD[userId];
            localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(allD));
        }

        localStorage.removeItem("vero_kyc_sync");
        localStorage.removeItem("vero_profile_sync");
    } catch {}
}

type BackendUser = {
    userId: string
    accountType?: string
    role?: string
    fullName?: string
    email?: string
    phone?: string | null
    currency?: string
    status?: string
    createdAt?: string
    nationality?: string
    dateOfBirth?: string
    governmentId?: string
    nationalIdentity?: string
    idDocument?: string
    documentUrl?: string
    avatarUrl?: string
    profilePhoto?: string
    totalProject?: number
    totalAmount?: number
    paidAmount?: number
    dueAmount?: number
    refundAmount?: number
    profit?: number
}



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
    const [pageSize, setPageSize] = useState(10)
    const [debouncedQuery, setDebouncedQuery] = useState(query)

    // Modal State
    const [selectedUser, setSelectedUser] = useState<BackendUser | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const router = useRouter()
    const token = useAppSelector(state => state.auth.token)
    const queryClient = useQueryClient()

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query)
        }, 0)
        return () => clearTimeout(handler)
    }, [query])

    // React Query fetches and caches all users (30s stale, 5min GC — set in QueryClient config)
    const { data: rawUsers = [], isFetching } = useQuery<any[]>({
        queryKey: ["admin-users", "user", token],
        queryFn: async () => {
            const response = await fetch('/admin/api/sso/auth/admin/users?accountType=user', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error('Network response was not ok')
            const resData = await response.json()
            return resData.data?.users || resData.data || []
        },
        enabled: !!token,
    })

    // Map + filter entirely in memory — no extra network call on filter/page change
    const { items, totalResults, totalPages } = useMemo(() => {
        let filtered: BackendUser[] = rawUsers.map((u: any) => ({
            userId: u.userId || u.id,
            fullName: u.fullName || u.email,
            email: u.email,
            phone: u.phone,
            currency: u.currency,
            status: u.status,
            kycStatus: u.kycStatus,
            createdAt: u.createdAt,
            nationality: u.nationality,
            dateOfBirth: u.dateOfBirth,
            governmentId: u.governmentId || u.nationalIdentity,
            nationalIdentity: u.nationalIdentity || u.governmentId,
            idDocument: u.idDocument || u.documentUrl,
            documentUrl: u.idDocument || u.documentUrl,
            avatarUrl: u.profilePhoto || u.avatarUrl,
            profilePhoto: u.profilePhoto || u.avatarUrl,
            totalProject: u.totalProject || 0,
            totalAmount: u.totalAmount || 0,
            paidAmount: u.paidAmount || 0,
            dueAmount: u.dueAmount || 0,
            refundAmount: u.refundAmount || 0,
            profit: u.profit || 0,
        }))

        if (debouncedQuery) {
            const q = debouncedQuery.toLowerCase()
            filtered = filtered.filter(u =>
                u.fullName?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            )
        }
        if (status && status !== "All Statuses") {
            filtered = filtered.filter(u => u.status?.toLowerCase() === status.toLowerCase())
        }
        if (currency && currency !== "All Currencies") {
            filtered = filtered.filter(u => u.currency === currency)
        }

        const total = filtered.length
        const pages = Math.max(1, Math.ceil(total / pageSize))
        const startIdx = (page - 1) * pageSize
        return { items: filtered.slice(startIdx, startIdx + pageSize), totalResults: total, totalPages: pages }
    }, [rawUsers, debouncedQuery, status, currency, page, pageSize])

    const handleView = (user: BackendUser) => {
        setSelectedUser(user)
        setIsModalOpen(true)
    }

    const handleStatusUpdate = async (userId: string, newStatus: string) => {
        try {
            // Optimistically update React Query cache in-memory immediately (NO table refetch spinner!)
            queryClient.setQueriesData({ queryKey: ["admin-users"] }, (oldData: any) => {
                if (!oldData) return oldData;
                if (Array.isArray(oldData)) {
                    return oldData.map(u => (u.userId === userId || u.id === userId) ? { ...u, status: newStatus } : u);
                }
                if (oldData.data && Array.isArray(oldData.data)) {
                    return { ...oldData, data: oldData.data.map((u: any) => (u.userId === userId || u.id === userId) ? { ...u, status: newStatus } : u) };
                }
                return oldData;
            });

            setSelectedUser(prev => prev?.userId === userId ? { ...prev, status: newStatus } : prev);

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

            // Real-time broadcast to user profile and all web tabs
            const lowerStatus = newStatus.toLowerCase();
            window.dispatchEvent(new CustomEvent("vero:user_status_updated", { detail: { userId, status: lowerStatus } }));
            try {
              if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                const bc = new BroadcastChannel("vero_channel");
                bc.postMessage({ type: "vero:user_status_updated", userId, status: lowerStatus });
                bc.close();
              }
            } catch {}
            try {
              localStorage.setItem("vero_profile_sync", JSON.stringify({ userId, status: lowerStatus, t: Date.now() }));
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
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Failed to delete");
            }
            // Invalidate React Query caches for both admin users and kyc queue
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin", "kyc-queue"] });
            toast.success("User account permanently deleted.");
            
            // Clear local storage overrides & broadcast deletion to all windows/tabs
            clearAllUserStorage(userId);
            window.dispatchEvent(new CustomEvent("vero:user_deleted", { detail: { userId } }));
            window.dispatchEvent(new CustomEvent("vero:kyc_updated", { detail: { userId, kycStatus: "none" } }));
            try {
              if ("BroadcastChannel" in window) {
                const bc = new BroadcastChannel("vero_channel");
                bc.postMessage({ type: "vero:kyc_updated", userId, kycStatus: "none" });
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
                                        {u.userId && (u.userId.startsWith("USR-") || u.userId.startsWith("AFF-") || u.userId.startsWith("BSN-"))
                                          ? u.userId
                                          : `USR-${(parseInt((u.userId || '').replace(/\D/g, '').slice(-4), 10) || 1) < 10 ? `0${parseInt((u.userId || '').replace(/\D/g, '').slice(-4), 10) || 1}` : parseInt((u.userId || '').replace(/\D/g, '').slice(-4), 10) || 1}`}
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
                                        <span className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-sm border ${getStatusColor(u.status || '')}`}>
                                            {(u.status || 'PENDING').toUpperCase()}
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
                token={token}
            />
        </div>
    )
}

export default AllUserTable