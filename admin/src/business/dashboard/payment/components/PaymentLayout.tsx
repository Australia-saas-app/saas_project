"use client"

import React, { useState, useEffect } from "react"
import PageHeader from '@/src/shared/ui/ui/PageHeader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/shared/ui/ui/select'
import { Pagination } from "@/src/shared/ui/ui/pagination"
import { SearchInput } from "@/src/shared/ui/form/search-input"
import { Eye, CheckCircle2, XCircle, ArrowUpRight, Clock, Loader2, RefreshCw } from "lucide-react"
import { Table } from "@/src/shared/ui/table/Table"
import { TableHeading } from "@/src/shared/ui/table/TableHeading"
import { TableRow } from "@/src/shared/ui/table/TableRow"
import { TableColumn } from "@/src/shared/ui/table/TableColumn"
import { Button } from "@/src/shared/ui/ui/button"
import axiosInstanceClient from "@/src/infra/lib/axiosInstance/client"
import { toast } from "sonner"

const demoPayments = Array.from({ length: 15 }).map((_, i) => ({
  id: `71L69PJK${i + 1}`,
  method: ['Stripe', 'Stripe', 'paypal', 'Stripe', 'paypal'][i % 5],
  type: ['solution', 'Deposit & Annual fee', 'Deposit', 'Stripe', 'solution'][i % 5],
  amount: `${110 + i * 10} usd`,
  dateTime: 'UTC.03-02-25. 02:05 PM',
  status: ['failed', 'Disputed', 'Disputed', 'failed', 'succeeded'][i % 5],
}))

interface WithdrawalItem {
  id: string;
  requestId: string;
  businessUserId: string;
  amount: number;
  currency: string;
  stripeAccountId?: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  stripeTransferId?: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
    case 'paid':
      return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
    case 'failed':
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    case 'disputed':
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

const PaymentLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals'>('transactions')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState("")

  // Withdrawals state
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true)
    try {
      const res = await axiosInstanceClient.get('/payment/withdrawals/all')
      const list = res.data?.data || res.data || []
      if (Array.isArray(list)) {
        setWithdrawals(list)
      }
    } catch {
      // Demo fallback if backend is starting up or has no records
      setWithdrawals([
        {
          id: "w-demo-1",
          requestId: "WREQ-2025-001",
          businessUserId: "BUS-882194",
          amount: 450.00,
          currency: "USD",
          stripeAccountId: "acct_1NZs9k2eZvKYlo2C",
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        {
          id: "w-demo-2",
          requestId: "WREQ-2025-002",
          businessUserId: "BUS-331092",
          amount: 1200.00,
          currency: "USD",
          stripeAccountId: "acct_1PM88d2eZvKYlo4A",
          status: "paid",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          stripeTransferId: "tr_3Nw4k2eZvKYlo2C019",
        }
      ])
    } finally {
      setLoadingWithdrawals(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'withdrawals') {
      fetchWithdrawals()
    }
  }, [activeTab])

  const handleApproveWithdrawal = async (item: WithdrawalItem) => {
    setActionInProgress(item.id)
    try {
      const res = await axiosInstanceClient.post(`/payment/withdrawals/${item.id}/pay`, {
        note: "Approved and transferred via Admin Portal",
      })
      toast.success(res.data?.message || `Withdrawal payout for $${item.amount} approved and processed!`)
      fetchWithdrawals()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to process withdrawal payout")
    } finally {
      setActionInProgress(null)
    }
  }

  const handleRejectWithdrawal = async (item: WithdrawalItem) => {
    const reason = window.prompt("Reason for rejection (funds will return to business wallet):", "KYC compliance documentation required")
    if (!reason) return

    setActionInProgress(item.id)
    try {
      const res = await axiosInstanceClient.post(`/payment/withdrawals/${item.id}/reject`, { reason })
      toast.success(res.data?.message || `Withdrawal rejected. Funds restored to user balance.`)
      fetchWithdrawals()
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to reject withdrawal")
    } finally {
      setActionInProgress(null)
    }
  }

  const totalResults = demoPayments.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const paginatedPayments = demoPayments.slice((page - 1) * pageSize, page * pageSize)

  const pendingCount = withdrawals.filter((w) => w.status?.toLowerCase() === 'pending').length

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader title="Payment & Payout Management" />
          
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Transactions & Gateway Logs
            </button>
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'withdrawals'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Withdrawal & Payout Requests
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'transactions' ? (
          <>
            {/* Filters Toolbar */}
            <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
              
              {/* Left side: Search */}
              <div className="w-full 2xl:w-64 flex-shrink-0">
                <SearchInput 
                  value={search}
                  onChange={setSearch}
                  placeholder="Search..." 
                  className="w-full"
                />
              </div>

              {/* Right side: Dropdowns */}
              <div className="flex flex-col sm:flex-row flex-wrap 2xl:flex-nowrap items-stretch sm:items-center gap-2.5 w-full 2xl:w-auto 2xl:ml-auto">
                
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[130px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                    <SelectValue placeholder="All Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Type</SelectItem>
                    <SelectItem value="payment" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Payment</SelectItem>
                    <SelectItem value="refund" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Refund</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[130px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                    <SelectValue placeholder="All Currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Currency</SelectItem>
                    <SelectItem value="usd" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">USD</SelectItem>
                    <SelectItem value="eur" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">EUR</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5">
                  <input type="date" className="h-10 px-2 w-[125px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer" />
                  <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">To</span>
                  <input type="date" className="h-10 px-2 w-[125px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer" />
                </div>

                <Select defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[130px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Status</SelectItem>
                    <SelectItem value="succeeded" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Succeeded</SelectItem>
                    <SelectItem value="failed" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Failed</SelectItem>
                    <SelectItem value="disputed" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data Table */}
            <div className="mt-2 w-full overflow-x-auto">
                <div className="min-w-[1000px]">
                  <Table>
                    <TableHeading>
                      <TableColumn isHeader align="center" className="font-bold">Transaction ID</TableColumn>
                      <TableColumn isHeader align="center" className="font-bold">Method</TableColumn>
                      <TableColumn isHeader align="center" className="font-bold">Type</TableColumn>
                      <TableColumn isHeader align="center" className="font-bold">Amount</TableColumn>
                      <TableColumn isHeader align="center" className="font-bold">Date & Time</TableColumn>
                      <TableColumn isHeader align="center" className="font-bold">Status</TableColumn>
                      <TableColumn isHeader align="center" className="font-bold">Action</TableColumn>
                    </TableHeading>
                    <tbody>
                      {paginatedPayments.length === 0 ? (
                        <TableRow>
                          <TableColumn colSpan={7}>
                            <div className="flex flex-col items-center justify-center gap-3 py-10">
                              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No payments found</h3>
                            </div>
                          </TableColumn>
                        </TableRow>
                      ) : (
                        paginatedPayments.map((item, index) => (
                          <TableRow key={index}>
                            <TableColumn align="center" className="font-semibold text-slate-700 dark:text-slate-200">{item.id}</TableColumn>
                            <TableColumn align="center" className="text-slate-600 dark:text-slate-300 font-medium">{item.method}</TableColumn>
                            <TableColumn align="center" className="text-slate-600 dark:text-slate-300">{item.type}</TableColumn>
                            <TableColumn align="center" className="font-semibold text-slate-800 dark:text-slate-200">{item.amount}</TableColumn>
                            <TableColumn align="center" className="text-slate-600 dark:text-slate-400 font-medium">{item.dateTime}</TableColumn>
                            <TableColumn align="center">
                              <span className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md border ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </TableColumn>
                            <TableColumn align="center">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
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
          </>
        ) : (
          /* Withdrawals & Payout Requests View */
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Business Withdrawal Requests Queue</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Review pending payout requests, execute Stripe Connect transfers, or restore user balances.</p>
              </div>
              <button
                onClick={fetchWithdrawals}
                disabled={loadingWithdrawals}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWithdrawals ? 'animate-spin' : ''}`} />
                Refresh Queue
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[1050px]">
                <Table>
                  <TableHeading>
                    <TableColumn isHeader align="center" className="font-bold">Request ID</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Business User</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Amount</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Payout Destination</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Created Date</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Status</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Admin Actions</TableColumn>
                  </TableHeading>
                  <tbody>
                    {loadingWithdrawals ? (
                      <TableRow>
                        <TableColumn colSpan={7}>
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          </div>
                        </TableColumn>
                      </TableRow>
                    ) : withdrawals.length === 0 ? (
                      <TableRow>
                        <TableColumn colSpan={7}>
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-500">
                            <CheckCircle2 className="w-8 h-8 text-green-500 opacity-80" />
                            <p className="font-medium text-sm">No withdrawal requests found.</p>
                          </div>
                        </TableColumn>
                      </TableRow>
                    ) : (
                      withdrawals.map((item) => {
                        const isPending = item.status?.toLowerCase() === 'pending'
                        const isBusy = actionInProgress === item.id

                        return (
                          <TableRow key={item.id}>
                            <TableColumn align="center" className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {item.requestId || item.id}
                            </TableColumn>
                            <TableColumn align="center" className="text-xs text-slate-600 dark:text-slate-300">
                              {item.businessUserId}
                            </TableColumn>
                            <TableColumn align="center" className="font-bold text-slate-900 dark:text-white">
                              ${Number(item.amount).toFixed(2)} {item.currency || "USD"}
                            </TableColumn>
                            <TableColumn align="center" className="font-mono text-xs text-slate-600 dark:text-slate-400">
                              {item.stripeAccountId || "Standard Bank Transfer"}
                            </TableColumn>
                            <TableColumn align="center" className="text-xs text-slate-500 dark:text-slate-400">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recent"}
                            </TableColumn>
                            <TableColumn align="center">
                              <span className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md border uppercase ${getStatusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </TableColumn>
                            <TableColumn align="center">
                              {isPending ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleApproveWithdrawal(item)}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Approve & Pay Out
                                  </button>
                                  <button
                                    onClick={() => handleRejectWithdrawal(item)}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 font-mono">
                                  {item.stripeTransferId ? `Transfer: ${item.stripeTransferId.slice(0, 12)}...` : "Completed"}
                                </span>
                              )}
                            </TableColumn>
                          </TableRow>
                        )
                      })
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentLayout
