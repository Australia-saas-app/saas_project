"use client";

import React, { useState, useMemo } from "react";
import PageHeader from "@/src/shared/ui/ui/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/ui/select";
import { Pagination } from "@/src/shared/ui/ui/pagination";
import { SearchInput } from "@/src/shared/ui/form/search-input";
import { Eye, CheckCircle2, XCircle, Clock, RefreshCw, Activity, Terminal, ShieldAlert } from "lucide-react";
import { Table } from "@/src/shared/ui/table/Table";
import { TableHeading } from "@/src/shared/ui/table/TableHeading";
import { TableRow } from "@/src/shared/ui/table/TableRow";
import { TableColumn } from "@/src/shared/ui/table/TableColumn";
import { Button } from "@/src/shared/ui/ui/button";

const demoPayments = Array.from({ length: 15 }).map((_, i) => ({
  id: `71L69PJK${i + 1}`,
  method: ["Stripe", "Stripe", "PayPal", "Stripe", "PayPal"][i % 5],
  type: ["solution", "Deposit & Annual fee", "Deposit", "Stripe", "solution"][i % 5],
  amount: `${110 + i * 10} USD`,
  dateTime: "UTC.03-02-25. 02:05 PM",
  status: ["failed", "Disputed", "Disputed", "failed", "succeeded"][i % 5],
}));

interface GatewayLogItem {
  id: string;
  gateway: "Stripe" | "PayPal" | "API Gateway";
  event: string;
  endpoint: string;
  statusCode: number;
  statusText: string;
  timestamp: string;
  responseTime: string;
}

const mockGatewayLogs: GatewayLogItem[] = [
  {
    id: "GW-LOG-9081",
    gateway: "Stripe",
    event: "payment_intent.succeeded",
    endpoint: "POST /api/v1/payment/webhook",
    statusCode: 200,
    statusText: "SUCCESS",
    timestamp: "Oct 26, 2026, 02:15 PM",
    responseTime: "142ms",
  },
  {
    id: "GW-LOG-9080",
    gateway: "Stripe",
    event: "charge.captured",
    endpoint: "POST /v1/charges/ch_3M4qL8eZvKYlo1/capture",
    statusCode: 200,
    statusText: "SUCCESS",
    timestamp: "Oct 26, 2026, 01:48 PM",
    responseTime: "88ms",
  },
  {
    id: "GW-LOG-9079",
    gateway: "PayPal",
    event: "CHECKOUT.ORDER.APPROVED",
    endpoint: "POST /api/v1/payment/paypal/webhook",
    statusCode: 200,
    statusText: "SUCCESS",
    timestamp: "Oct 26, 2026, 12:30 PM",
    responseTime: "210ms",
  },
  {
    id: "GW-LOG-9078",
    gateway: "API Gateway",
    event: "wallet.withdrawal.requested",
    endpoint: "POST /api/v1/payment/withdrawals/request",
    statusCode: 201,
    statusText: "CREATED",
    timestamp: "Oct 26, 2026, 11:15 AM",
    responseTime: "65ms",
  },
  {
    id: "GW-LOG-9077",
    gateway: "Stripe",
    event: "payment_intent.payment_failed",
    endpoint: "POST /api/v1/payment/webhook",
    statusCode: 400,
    statusText: "CARD_DECLINED",
    timestamp: "Oct 26, 2026, 09:20 AM",
    responseTime: "195ms",
  },
  {
    id: "GW-LOG-9076",
    gateway: "API Gateway",
    event: "security_deposit.verification",
    endpoint: "GET /api/v1/payment/deposit/status",
    statusCode: 200,
    statusText: "OK",
    timestamp: "Oct 25, 2026, 08:40 PM",
    responseTime: "42ms",
  },
];

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "succeeded":
    case "paid":
    case "success":
    case "ok":
    case "created":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "failed":
    case "rejected":
    case "card_declined":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "disputed":
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const PaymentLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"transactions" | "gateway-logs">("transactions");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  // Filter states for Transactions
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter states for Gateway Logs
  const [gatewayFilter, setGatewayFilter] = useState("all");
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

  // Transactions Filtering
  const filteredPayments = useMemo(() => {
    return demoPayments.filter((item) => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!item.id.toLowerCase().includes(q) && !item.method.toLowerCase().includes(q) && !item.type.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (typeFilter !== "all" && item.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== "all" && item.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [search, typeFilter, statusFilter]);

  const totalResults = filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const paginatedPayments = filteredPayments.slice((page - 1) * pageSize, page * pageSize);

  // Gateway Logs Filtering
  const filteredGatewayLogs = useMemo(() => {
    return mockGatewayLogs.filter((log) => {
      if (gatewayFilter !== "all" && log.gateway.toLowerCase() !== gatewayFilter.toLowerCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          log.id.toLowerCase().includes(q) ||
          log.event.toLowerCase().includes(q) ||
          log.endpoint.toLowerCase().includes(q) ||
          log.statusText.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [gatewayFilter, search]);

  const handleRefreshLogs = () => {
    setIsRefreshingLogs(true);
    setTimeout(() => {
      setIsRefreshingLogs(false);
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <PageHeader title="Transactions Management" />
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Monitor incoming transactions, payment methods, and live payment gateway event logs.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto border border-gray-200 dark:border-slate-700">
            <button
              onClick={() => {
                setActiveTab("transactions");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "transactions"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Transactions
            </button>
            <button
              onClick={() => {
                setActiveTab("gateway-logs");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "gateway-logs"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              Gateway Logs
            </button>
          </div>
        </div>

        {activeTab === "transactions" ? (
          <>
            {/* Filters Toolbar */}
            <div className="flex flex-col 2xl:flex-row items-stretch 2xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
              {/* Left side: Search */}
              <div className="w-full 2xl:w-64 flex-shrink-0">
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search transaction..."
                  className="w-full"
                />
              </div>

              {/* Right side: Dropdowns */}
              <div className="flex flex-col sm:flex-row flex-wrap 2xl:flex-nowrap items-stretch sm:items-center gap-2.5 w-full 2xl:w-auto 2xl:ml-auto">
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[130px] h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                    <SelectValue placeholder="All Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
                    <SelectItem value="all" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Type</SelectItem>
                    <SelectItem value="solution" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Solution</SelectItem>
                    <SelectItem value="deposit" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Deposit</SelectItem>
                    <SelectItem value="stripe" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Stripe</SelectItem>
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
                  <input
                    type="date"
                    className="h-10 px-2 w-[125px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  />
                  <span className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase">To</span>
                  <input
                    type="date"
                    className="h-10 px-2 w-[125px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
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
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          </>
        ) : (
          /* Gateway Logs View */
          <div className="space-y-4">
            {/* Gateway Filter Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Live Payment Gateway Logs</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Webhook callbacks, authorization events, and API gateway telemetry.</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="All Gateways" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Gateways</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="api gateway">API Gateway</SelectItem>
                  </SelectContent>
                </Select>

                <button
                  onClick={handleRefreshLogs}
                  disabled={isRefreshingLogs}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLogs ? "animate-spin text-blue-600" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Gateway Logs Table */}
            <div className="w-full overflow-x-auto">
              <div className="min-w-[950px]">
                <Table>
                  <TableHeading>
                    <TableColumn isHeader align="center" className="font-bold">Log ID</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Gateway</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Event Type</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Endpoint / Source</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Status Code</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Response Time</TableColumn>
                    <TableColumn isHeader align="center" className="font-bold">Timestamp</TableColumn>
                  </TableHeading>
                  <tbody>
                    {filteredGatewayLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableColumn align="center" className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {log.id}
                        </TableColumn>
                        <TableColumn align="center">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {log.gateway}
                          </span>
                        </TableColumn>
                        <TableColumn align="center">
                          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                            {log.event}
                          </span>
                        </TableColumn>
                        <TableColumn align="center" className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {log.endpoint}
                        </TableColumn>
                        <TableColumn align="center">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-md border ${getStatusColor(log.statusText)}`}>
                            {log.statusCode} {log.statusText}
                          </span>
                        </TableColumn>
                        <TableColumn align="center" className="text-xs font-mono text-slate-500">
                          {log.responseTime}
                        </TableColumn>
                        <TableColumn align="center" className="text-xs text-slate-500 dark:text-slate-400">
                          {log.timestamp}
                        </TableColumn>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentLayout;
