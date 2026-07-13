"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/src/infra/api/apiClient";
import { Table, TableBody, TableColumn, TableHeading, TableRow } from "@/src/shared/ui/table";
import { Badge } from "@/src/shared/ui/ui/badge";
import { Button } from "@/src/shared/ui/ui/button";
import { Modal } from "@/src/shared/ui/ui/modal";
import { toast } from "sonner";
import { Eye, CheckCircle, XCircle, Search } from "lucide-react";
import { SearchInput } from "@/src/shared/ui/form/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/ui/select";
import { Pagination } from "@/src/shared/ui/ui/pagination";

interface KycApplication {
  id: string;
  userId: string;
  userName: string;
  documentType: string;
  documentUrl: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
}

export default function KycQueuePage() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<KycApplication | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 1. Fetch KYC Applications
  const { data: applications, isLoading } = useQuery<KycApplication[]>({
    queryKey: ["kyc-applications"],
    queryFn: async () => {
      // return apiClient.get<KycApplication[]>("/kyc/pending");
      
      // MOCK DATA for now until backend is ready
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            {
              id: "kyc_1",
              userId: "u_101",
              userName: "Alice Smith",
              documentType: "Passport",
              documentUrl: "https://example.com/passport.jpg",
              status: "pending",
              submittedAt: new Date().toISOString(),
            },
            {
              id: "kyc_2",
              userId: "u_102",
              userName: "Bob Jones",
              documentType: "Driver's License",
              documentUrl: "https://example.com/license.jpg",
              status: "pending",
              submittedAt: new Date(Date.now() - 86400000).toISOString(),
            },
          ]);
        }, 800);
      });
    }
  });

  // 2. Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      // return apiClient.post(`/kyc/${id}/approve`, {});
      return new Promise(resolve => setTimeout(resolve, 0));
    },
    onSuccess: () => {
      toast.success("KYC Application Approved!");
      queryClient.invalidateQueries({ queryKey: ["kyc-applications"] });
      setSelectedApp(null);
    }
  });

  // 3. Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      // return apiClient.post(`/kyc/${id}/reject`, {});
      return new Promise(resolve => setTimeout(resolve, 0));
    },
    onSuccess: () => {
      toast.error("KYC Application Rejected!");
      queryClient.invalidateQueries({ queryKey: ["kyc-applications"] });
      setSelectedApp(null);
    }
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800 uppercase text-[10px]">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 uppercase text-[10px]">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 uppercase text-[10px]">Rejected</Badge>;
      default:
        return <Badge className="uppercase text-[10px]">{status}</Badge>;
    }
  };

  const filtered = (applications || []).filter(app => {
    const q = query.toLowerCase();
    const matchesQuery = app.userName.toLowerCase().includes(q) || app.documentType.toLowerCase().includes(q);
    const matchesStatus = status === "All Statuses" || app.status === status;
    return matchesQuery && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full">
        
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
          <div className="w-full xl:w-80 flex-shrink-0">
            <SearchInput 
              value={query} 
              onChange={setQuery} 
              placeholder="Search by name or document..." 
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
                <SelectItem value="pending" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Pending</SelectItem>
                <SelectItem value="approved" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Approved</SelectItem>
                <SelectItem value="rejected" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12 text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <Table>
            <TableHeading>
              <TableColumn isHeader>User Name</TableColumn>
              <TableColumn isHeader>Document Type</TableColumn>
              <TableColumn isHeader align="center">Status</TableColumn>
              <TableColumn isHeader align="center">Submitted</TableColumn>
              <TableColumn isHeader align="center">Actions</TableColumn>
            </TableHeading>

            <TableBody isEmpty={pageItems.length === 0} colSpan={5}>
              {pageItems.map((row) => (
                <TableRow key={row.id}>
                  <TableColumn>
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {row.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-100">{row.userName}</div>
                        </div>
                    </div>
                  </TableColumn>
                  <TableColumn>
                    <span className="text-gray-500">{row.documentType}</span>
                  </TableColumn>
                  <TableColumn align="center">
                    <div className="flex justify-center">
                      {getStatusBadge(row.status)}
                    </div>
                  </TableColumn>
                  <TableColumn align="center">
                    <span className="text-gray-500 text-sm">{new Date(row.submittedAt).toLocaleDateString()}</span>
                  </TableColumn>
                  <TableColumn align="center">
                    <div className="flex justify-center">
                      <button
                          onClick={() => setSelectedApp(row)}
                          className="inline-flex items-center justify-center p-2 rounded-md hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                          <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </TableColumn>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* ── Pagination ── */}
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

      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title="Review KYC Application"
      >
        {selectedApp && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">User Name</p>
                <p className="text-gray-900 dark:text-white font-medium">{selectedApp.userName}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Document Type</p>
                <p className="text-gray-900 dark:text-white font-medium">{selectedApp.documentType}</p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Document Image</p>
              </div>
              <div className="p-4 flex justify-center bg-gray-50 dark:bg-slate-900/50">
                {/* Placeholder for document image */}
                <div className="w-full max-w-sm aspect-video bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 shadow-sm transition-all hover:border-blue-300 cursor-pointer">
                  <Eye className="w-8 h-8 mb-2 text-gray-400" />
                  <span className="text-sm font-medium">Click to Preview Document</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => approveMutation.mutate(selectedApp.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve User
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={() => rejectMutation.mutate(selectedApp.id)}
                disabled={rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
