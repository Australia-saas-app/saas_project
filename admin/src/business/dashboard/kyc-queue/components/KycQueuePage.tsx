"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table } from "@/src/shared/ui/table/Table";
import { TableBody } from "@/src/shared/ui/table/TableBody";
import { TableColumn } from "@/src/shared/ui/table/TableColumn";
import { TableHeading } from "@/src/shared/ui/table/TableHeading";
import { TableRow } from "@/src/shared/ui/table/TableRow";
import { Badge } from "@/src/shared/ui/ui/badge";
import { toast } from "sonner";
import { Eye, Loader2 } from "lucide-react";
import { SearchInput } from "@/src/shared/ui/form/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/ui/select";
import { Pagination } from "@/src/shared/ui/ui/pagination";
import { useAppSelector } from "@/src/core/store/hooks";
import { KycReviewModal } from "./KycReviewModal";

function getUploadedAccountPhoto(row: any): string | null {
  if (!row) return null;
  const uid = row.userId || row.id;

  // Only take the actual uploaded profile photo from the user DB or recent local upload override
  let photo = row?.profilePhoto || row?.avatarUrl || null;

  if (!photo && uid && typeof window !== "undefined") {
    try {
      const overridesRaw = localStorage.getItem("user_profile_overrides_v2");
      if (overridesRaw) {
        const overrides = JSON.parse(overridesRaw);
        if (overrides[uid]?.avatarUrl) {
          photo = overrides[uid].avatarUrl;
        }
      }
    } catch { }
  }

  if (!photo) return null;

  // Verify it is not a live captured camera photo
  let snap: any = null;
  if (row?.kycApplicationData) {
    if (typeof row.kycApplicationData === "string") {
      try {
        snap = JSON.parse(row.kycApplicationData);
      } catch {
        snap = {};
      }
    } else {
      snap = row.kycApplicationData;
    }
  }

  const livePhoto = snap?.livePhotoUrl || snap?.liveCapturedPhoto || snap?.livePhoto || null;

  // Never display live biometric capture in the table's uploaded photo slot
  if (livePhoto && photo === livePhoto) {
    return null;
  }

  return photo;
}

export default function KycQueuePage() {
  const queryClient = useQueryClient();
  const token = useAppSelector((state) => state.auth.token);
  const searchParams = useSearchParams();

  // Read ?tab= from URL (e.g. from notification click: /admin/kyc-queue?tab=user)
  const tabParam = searchParams.get("tab");
  const validTabs = ["user", "affiliate", "business"] as const;
  const initialTab = validTabs.includes(tabParam as any) ? (tabParam as "user" | "affiliate" | "business") : "user";

  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [activeTab, setActiveTab] = useState<"user" | "affiliate" | "business">(initialTab);
  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});
  const [localRejectionReasons, setLocalRejectionReasons] = useState<Record<string, any>>({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sync tab when URL param changes (e.g. navigating from a notification)
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as "user" | "affiliate" | "business");
    }
  }, [tabParam]);

  const { data: users, isLoading, isFetching, refetch } = useQuery<any[]>({
    queryKey: ["kyc-users", token],
    queryFn: async () => {
      if (!token) return [];
      const response = await fetch('/admin/api/sso/auth/admin/users?limit=all&hasKyc=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Network error');
      const resData = await response.json();
      return resData.data?.users || resData.data || [];
    },
    enabled: !!token,
    staleTime: 30 * 1000,      // cache for 30s — avoids spinner on every page visit
    refetchOnWindowFocus: false, // don't re-fetch just because user switches tabs
    refetchInterval: 5000,
  });

  // Lifted processUpdate to update local cache, query data, and selected app
  const processUpdate = useCallback((uid?: string, newKycStatus?: string, rejectionReasons?: any) => {
    if (uid && newKycStatus) {
      setLocalOverrides(prev => ({ ...prev, [uid]: newKycStatus }));
      if (rejectionReasons) {
        setLocalRejectionReasons(prev => ({ ...prev, [uid]: rejectionReasons }));
      }
      setSelectedApp((prev: any) => {
        if (!prev) return prev;
        const id = prev.userId || prev.id;
        if (id === uid) {
          return {
            ...prev,
            kycStatus: newKycStatus,
            ...(rejectionReasons ? {
              kycRejectionReasons: rejectionReasons,
              kycApplicationData: {
                ...(typeof prev.kycApplicationData === "string" ? JSON.parse(prev.kycApplicationData) : (prev.kycApplicationData || {})),
                rejectionReasons
              }
            } : {})
          };
        }
        return prev;
      });

      queryClient.setQueryData(["kyc-users", token], (oldData: any[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((u: any) => {
          if (u.userId === uid || u.id === uid) {
            const currentSnap = typeof u.kycApplicationData === "string"
              ? (() => { try { return JSON.parse(u.kycApplicationData); } catch { return {}; } })()
              : (u.kycApplicationData || {});
            return {
              ...u,
              kycStatus: newKycStatus,
              ...(rejectionReasons ? {
                kycRejectionReasons: rejectionReasons,
                kycApplicationData: {
                  ...currentSnap,
                  rejectionReasons
                }
              } : (newKycStatus === "approved" ? {
                kycRejectionReasons: null,
                kycApplicationData: {
                  ...currentSnap,
                  rejectionReasons: null
                }
              } : {}))
            };
          }
          return u;
        });
      });

      refetch();
    }
  }, [queryClient, token, refetch]);

  // Auto-refetch and apply optimistic updates when an admin approves / rejects a KYC application or a user submits
  useEffect(() => {
    const handleKycUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      processUpdate(detail?.userId, detail?.kycStatus, detail?.rejectionReasons);
    };

    const handleUserStatusUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.userId && detail.kycStatus) {
        processUpdate(detail.userId, detail.kycStatus, detail.rejectionReasons);
      }
    };

    const handleProfileUpdate = () => {
      refetch();
    };

    window.addEventListener("vero:kyc_updated", handleKycUpdate);
    window.addEventListener("vero:user_status_updated", handleUserStatusUpdate);
    window.addEventListener("vero:profile_updated", handleProfileUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("vero_channel");
        bc.onmessage = (event) => {
          if (
            event.data?.type === "vero:kyc_updated" ||
            event.data?.type === "vero:kyc_submitted"
          ) {
            if (event.data?.userId && event.data?.kycStatus) {
              processUpdate(event.data.userId, event.data.kycStatus, event.data.rejectionReasons);
            }
          } else if (event.data?.type === "vero:profile_updated") {
            refetch();
          }
        };
      }
    } catch { }

    const handleStorage = (e: StorageEvent) => {
      if ((e.key === "vero_kyc_sync" || e.key === "vero_profile_sync") && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.userId && parsed.kycStatus) {
            processUpdate(parsed.userId, parsed.kycStatus, parsed.rejectionReasons);
          }
        } catch { }
      } else if (e.key === "user_profile_overrides_v2") {
        refetch();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("vero:kyc_updated", handleKycUpdate);
      window.removeEventListener("vero:user_status_updated", handleUserStatusUpdate);
      window.removeEventListener("vero:profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorage);
      if (bc) bc.close();
    };
  }, [processUpdate, refetch]);

  // Remove deleted users instantly from the KYC queue
  useEffect(() => {
    const handleUserDeleted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.userId) return;
      const uid = detail.userId;
      // Close the review modal if it was showing the deleted user
      setSelectedApp((prev: any) => {
        if (!prev) return prev;
        const id = prev.userId || prev.id;
        return id === uid ? null : prev;
      });
      // Remove from localOverrides
      setLocalOverrides(prev => {
        const next = { ...prev };
        delete next[uid];
        return next;
      });
      // Refetch to sync with server
      refetch();
    };
    window.addEventListener("vero:user_deleted", handleUserDeleted);
    return () => window.removeEventListener("vero:user_deleted", handleUserDeleted);
  }, [refetch]);


  // Calculate counts for tabs — use localOverrides so badge decrements instantly on approve/reject
  const kycCounts = {
    user: 0,
    affiliate: 0,
    business: 0
  };

  if (users) {
    users.forEach(u => {
      const uid = u.userId || u.id;
      const effectiveStatus = localOverrides[uid] || u.kycStatus;
      if (effectiveStatus === 'pending' || effectiveStatus === 'submitted') {
        if (u.accountType === 'user') kycCounts.user++;
        if (u.accountType === 'agency' || u.accountType === 'affiliate') kycCounts.affiliate++;
        if (u.accountType === 'business') kycCounts.business++;
      }
    });
  }

  const getStatusBadge = (kycStatus: string) => {
    switch (kycStatus?.toLowerCase()) {
      case "pending":
      case "submitted":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 uppercase text-[10px]">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 uppercase text-[10px]">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 uppercase text-[10px]">Rejected</Badge>;
      case "expired":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 uppercase text-[10px]">Expired</Badge>;
      default:
        return <Badge className="uppercase text-[10px] bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">None</Badge>;
    }
  };

  const filtered = (users || []).map(u => {
    const uid = u.userId || u.id;
    let res = u;
    if (localOverrides[uid]) res = { ...res, kycStatus: localOverrides[uid] };
    if (localRejectionReasons[uid]) {
      const currentSnap = typeof res.kycApplicationData === "string"
        ? (() => { try { return JSON.parse(res.kycApplicationData); } catch { return {}; } })()
        : (res.kycApplicationData || {});
      res = {
        ...res,
        kycRejectionReasons: localRejectionReasons[uid],
        kycApplicationData: {
          ...currentSnap,
          rejectionReasons: localRejectionReasons[uid]
        }
      };
    }
    return res;
  }).filter(u => {
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
    const uStatus = String(u.kycStatus || 'none').toLowerCase();
    if ((status === "Pending" || status === "Unverified") && (uStatus !== 'pending' && uStatus !== 'submitted')) return false;
    if ((status === "Approved" || status === "Verified") && uStatus !== 'approved') return false;
    if (status === "Rejected" && uStatus !== 'rejected') return false;
    if (status === "Expired" && uStatus !== 'expired') return false;

    // We only want to show users in the KYC queue if they have applied for KYC or are already approved/rejected/pending/expired
    if (!u.kycStatus || uStatus === 'none') return false;

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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border shadow-sm flex items-center gap-2 ${isActive
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-slate-800"
                  }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
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
                <SelectItem value="Pending" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Pending</SelectItem>
                <SelectItem value="Approved" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Approved</SelectItem>
                <SelectItem value="Rejected" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Rejected</SelectItem>
                <SelectItem value="Expired" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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

            <TableBody isEmpty={!isLoading && pageItems.length === 0} colSpan={6} emptyMessage="No KYC requests yet">
              {isLoading ? (
                <TableRow>
                  <TableColumn colSpan={6}>
                    <div className="flex flex-col items-center justify-center gap-3 py-10 w-full">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="text-gray-500 font-medium">Fetching KYC applications...</span>
                    </div>
                  </TableColumn>
                </TableRow>
              ) : (
                pageItems.map((row) => {
                  const uploadedPhoto = getUploadedAccountPhoto(row);
                  return (
                    <TableRow key={row.userId || row.id}>
                      <TableColumn>
                        <span className="font-mono font-medium text-gray-900 dark:text-gray-100 text-xs">
                          {row.displayUserId ? `KYC-${row.displayUserId}` : (row.userId ? `KYC-${row.userId}` : `KYC-${row.id}`)}
                        </span>
                      </TableColumn>
                      <TableColumn>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {uploadedPhoto ? (
                              <img src={uploadedPhoto} alt={row.fullName} className="w-full h-full object-cover" />
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
                          {getStatusBadge(localOverrides[row.userId || row.id] || row.kycStatus)}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

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
          onSuccess={(newStatus, reasons) => {
            const uid = selectedApp.userId || selectedApp.id;
            if (uid && newStatus) {
              processUpdate(uid, newStatus, reasons);
            }
            setSelectedApp(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
