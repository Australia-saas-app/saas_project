"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table } from "@/src/shared/ui/table/Table";
import { TableBody } from "@/src/shared/ui/table/TableBody";
import { TableColumn } from "@/src/shared/ui/table/TableColumn";
import { TableHeading } from "@/src/shared/ui/table/TableHeading";
import { TableRow } from "@/src/shared/ui/table/TableRow";
import { Badge } from "@/src/shared/ui/ui/badge";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import { SearchInput } from "@/src/shared/ui/form/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/ui/select";
import { Pagination } from "@/src/shared/ui/ui/pagination";
import { useAppSelector } from "@/src/core/store/hooks";
import { KycReviewModal } from "./KycReviewModal";

export default function KycQueuePage() {
  const queryClient = useQueryClient();
  const token = useAppSelector((state) => state.auth.token);
  
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [activeTab, setActiveTab] = useState<"user" | "affiliate" | "business">("user");
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: users, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["kyc-users"],
    queryFn: async () => {
      if (!token) return [];
      const response = await fetch('/admin/api/sso/auth/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Network error');
      const resData = await response.json();
      return resData.data?.users || resData.data || [];
    },
    enabled: !!token,
  });

  // Calculate counts for tabs
  const kycCounts = {
    user: 0,
    affiliate: 0,
    business: 0
  };

  if (users) {
    users.forEach(u => {
      if (u.kycStatus === 'pending' || u.kycStatus === 'submitted') {
        if (u.accountType === 'user') kycCounts.user++;
        if (u.accountType === 'agency' || u.accountType === 'affiliate') kycCounts.affiliate++;
        if (u.accountType === 'business') kycCounts.business++;
      }
    });
  }

  const getStatusBadge = (kycStatus: string) => {
    switch(kycStatus?.toLowerCase()) {
      case "pending":
      case "submitted":
        return <Badge className="bg-amber-100 text-amber-800 uppercase text-[10px]">Unverified</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 uppercase text-[10px]">Verified</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 uppercase text-[10px]">Rejected</Badge>;
      default:
        return <Badge className="uppercase text-[10px] bg-slate-100 text-slate-800">None</Badge>;
    }
  };

  const filtered = (users || []).filter(u => {
    // Tab filter
    if (activeTab === 'user' && u.accountType !== 'user') return false;
    if (activeTab === 'affiliate' && u.accountType !== 'agency' && u.accountType !== 'affiliate') return false;
    if (activeTab === 'business' && u.accountType !== 'business') return false;

    // Search filter
    const q = query.toLowerCase();
    const matchesQuery = 
      (u.fullName || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q);
    if (q && !matchesQuery) return false;

    // Status filter
    if (status === "Unverified" && (u.kycStatus !== 'pending' && u.kycStatus !== 'submitted')) return false;
    if (status === "Verified" && u.kycStatus !== 'approved') return false;

    // We only want to show users in the KYC queue if they have applied for KYC or are already verified/rejected
    if (!u.kycStatus || u.kycStatus === 'none') return false;

    return true;
  }).sort((a, b) => {
    // Pending first
    const aIsPending = a.kycStatus === 'pending' || a.kycStatus === 'submitted';
    const bIsPending = b.kycStatus === 'pending' || b.kycStatus === 'submitted';
    if (aIsPending && !bIsPending) return -1;
    if (bIsPending && !aIsPending) return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const tabs = [
    { id: "user", label: "Users" },
    { id: "affiliate", label: "Affiliates" },
    { id: "business", label: "Businesses" }
  ];

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        
        {/* Tabs */}
        <div className="flex gap-3 mb-2 flex-wrap">
          {tabs.map(tab => {
            const count = kycCounts[tab.id as keyof typeof kycCounts];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border shadow-sm flex items-center gap-2 ${
                  isActive 
                    ? "bg-blue-600 text-white border-blue-600" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
          <div className="w-full xl:w-80 flex-shrink-0">
            <SearchInput 
              value={query} 
              onChange={setQuery} 
              placeholder="Search by name or email..." 
              className="w-full"
            />
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto xl:ml-auto">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-full sm:w-[160px] data-[state=open]:ring-2 data-[state=open]:ring-blue-500/50 flex-shrink-0">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100]">
                <SelectItem value="All Statuses" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Statuses</SelectItem>
                <SelectItem value="Unverified" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Unverified</SelectItem>
                <SelectItem value="Verified" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <Table>
              <TableHeading>
                <TableColumn isHeader>Application ID</TableColumn>
                <TableColumn isHeader>Full Name</TableColumn>
                <TableColumn isHeader>Email</TableColumn>
                <TableColumn isHeader>Role</TableColumn>
                <TableColumn isHeader align="center">Status</TableColumn>
                <TableColumn isHeader align="center">Actions</TableColumn>
              </TableHeading>

              <TableBody isEmpty={pageItems.length === 0} colSpan={6} emptyMessage="No KYC requests yet">
                {pageItems.map((row) => (
                  <TableRow key={row.userId || row.id}>
                    <TableColumn>
                      <span className="font-mono font-medium text-gray-900 dark:text-gray-100 text-xs">
                        {row.displayUserId ? `KYC-${row.displayUserId}` : (row.userId ? `KYC-${row.userId}` : `KYC-${row.id}`)}
                      </span>
                    </TableColumn>
                    <TableColumn>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {row.profilePhoto ? (
                             <img src={row.profilePhoto} alt={row.fullName} className="w-full h-full object-cover" />
                          ) : (
                            (row.fullName || row.email || "U").charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {row.fullName || "N/A"}
                        </span>
                      </div>
                    </TableColumn>
                    <TableColumn>
                      <span className="text-gray-500">{row.email}</span>
                    </TableColumn>
                    <TableColumn>
                      <span className="text-gray-500 capitalize">{row.role || row.accountType}</span>
                    </TableColumn>
                    <TableColumn align="center">
                      <div className="flex justify-center">
                        {getStatusBadge(row.kycStatus)}
                      </div>
                    </TableColumn>
                    <TableColumn align="center">
                      <div className="flex justify-center">
                        <button
                            onClick={() => setSelectedApp(row)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </TableColumn>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && (
          <div className="mt-2 w-full">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
              pageSize={pageSize}
              totalResults={filtered.length}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
            />
          </div>
        )}
      </div>

      {selectedApp && (
        <KycReviewModal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          user={selectedApp}
          onSuccess={() => {
            refetch();
            setSelectedApp(null);
          }}
        />
      )}
    </div>
  );
}
