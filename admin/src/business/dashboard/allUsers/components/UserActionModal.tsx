"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, X, Shield, AlertTriangle, History, CheckCircle2 } from "lucide-react";
import { useAppSelector } from "@/src/core/store/hooks";

interface BackendUser {
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountType?: string;
  status?: string;
  kycStatus?: string;
  createdAt?: string;
  avatarUrl?: string;
  profilePhoto?: string;
  statusHistory?: Array<{
    fromStatus?: string;
    status: string;
    reason?: string;
    changedBy?: string;
    changedAt: string;
    isOverride?: boolean;
    recoveryExpiresAt?: string;
    restoredAt?: string;
  }>;
}

interface UserActionModalProps {
  user: BackendUser | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (userId: string, newStatus: string, reason?: string, isAdminOverride?: boolean) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  token?: string;
}

export const ALL_ACCOUNT_STATUSES = [
  "ACTIVE",
  "PENDING",
  "UNDER_REVIEW",
  "SUSPENDED",
  "BLOCKED",
  "DORMANT",
  "DEACTIVATED",
  "CLOSED",
] as const;

// Strict Account Status Transition Rules (Image 2)
export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["ACTIVE", "UNDER_REVIEW"],
  ACTIVE: ["UNDER_REVIEW", "SUSPENDED", "BLOCKED", "DORMANT", "DEACTIVATED"],
  UNDER_REVIEW: ["ACTIVE", "SUSPENDED", "BLOCKED"],
  SUSPENDED: ["ACTIVE", "BLOCKED"],
  BLOCKED: ["ACTIVE"],
  DORMANT: ["ACTIVE"],
  DEACTIVATED: ["ACTIVE", "CLOSED"],
  CLOSED: [],
  INACTIVE: ["ACTIVE", "PENDING", "DORMANT"],
};

export function normalizeAccountStatus(status?: string): string {
  const raw = String(status || "PENDING").toUpperCase().trim().replace(/[\s-]+/g, "_");
  if (raw === "SUSPEND") return "SUSPENDED";
  if (raw === "BLOCK") return "BLOCKED";
  if (raw === "DEACTIVATE") return "DEACTIVATED";
  if (raw === "CLOSE") return "CLOSED";
  if (raw === "REVIEW" || raw === "UNDERREVIEW") return "UNDER_REVIEW";
  if (raw === "VERIFY" || raw === "ACTIVATE" || raw === "APPROVED") return "ACTIVE";
  if (raw === "UNVERIFY" || raw === "REJECTED") return "PENDING";
  return raw;
}

export function getStatusBadgeStyle(status: string) {
  const norm = normalizeAccountStatus(status);
  switch (norm) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
    case "UNDER_REVIEW":
      return "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800";
    case "SUSPENDED":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800";
    case "BLOCKED":
      return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
    case "DORMANT":
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    case "DEACTIVATED":
      return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    case "CLOSED":
      return "bg-gray-200 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  }
}

export function UserActionModal({ user, isOpen, onClose, onStatusUpdate, onDelete, token: propToken }: UserActionModalProps) {
  const reduxToken = useAppSelector((state: any) => state.auth?.token);
  const adminUser = useAppSelector((state: any) => state.auth?.user);
  const token = propToken || reduxToken;
  const isSuperAdmin = adminUser?.role === 'super_admin' || adminUser?.role === 'admin';

  const currentStatus = normalizeAccountStatus(user?.status);

  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isAdminOverride, setIsAdminOverride] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [updatingAction, setUpdatingAction] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Allowed transitions based on Image 2
  const allowedTransitions = useMemo(() => {
    return ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  }, [currentStatus]);

  // Available status choices in dropdown
  const availableStatuses = useMemo(() => {
    if (isAdminOverride) {
      return ALL_ACCOUNT_STATUSES.filter(s => s !== currentStatus);
    }
    return allowedTransitions;
  }, [isAdminOverride, allowedTransitions, currentStatus]);

  useEffect(() => {
    if (user) {
      const norm = normalizeAccountStatus(user.status);
      const allowed = ALLOWED_STATUS_TRANSITIONS[norm] || [];
      setSelectedStatus(allowed.length > 0 ? allowed[0] : norm);
      setReason("");
      setIsAdminOverride(false);
      setShowHistory(false);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const fullName = user.fullName || "User";
  const email = user.email || user.phone || "No Email/Phone";
  const rawRole = String(user.accountType || user.role || "USER");
  const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
  const createdAt = user.createdAt && !isNaN(new Date(user.createdAt).getTime())
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "NA";

  const handleUpdate = async () => {
    if (!selectedStatus) {
      toast.error("Please select a target status.");
      return;
    }

    if (selectedStatus === currentStatus) {
      toast.error(`User is already in '${currentStatus}' status.`);
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      toast.error("A reason for status change is mandatory.");
      return;
    }

    if (isAdminOverride && trimmedReason.length < 5) {
      toast.error("Administrative override requires a justification of at least 5 characters.");
      return;
    }

    try {
      setUpdatingAction(selectedStatus);
      await onStatusUpdate(
        user.userId || (user as any).id,
        selectedStatus,
        trimmedReason,
        isAdminOverride
      );
      toast.success(`Status updated to ${selectedStatus} successfully.`);
      setUpdatingAction("");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
      setUpdatingAction("");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(user.userId || (user as any).id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const currentKycStatus = (user.kycStatus || "NONE").toUpperCase();
  const kycBadgeText = currentKycStatus === "APPROVED" ? "Verified" : "Unverified";
  const kycBadgeColors = currentKycStatus === "APPROVED" 
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

  const statusHistory = Array.isArray(user.statusHistory) ? user.statusHistory : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
        style={{ maxWidth: '640px' }}
      >
        {showDeleteConfirm ? (
          <div className="p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete User?</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
              Are you sure you want to permanently delete <span className="font-semibold">{fullName}</span>? All user data will be permanently cleared.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                No, Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Overview</h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeStyle(currentStatus)}`}>
                  {currentStatus.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${kycBadgeColors}`}>
                  {kycBadgeText}
                </span>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting || !!updatingAction}
                  className="flex items-center justify-center p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors disabled:opacity-50"
                  title="Delete Account"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={18} strokeWidth={2.5} />}
                </button>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* User details */}
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <span className="text-slate-400 font-semibold text-xs block">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold text-xs block">Email / Phone</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <Shield className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold text-xs block">Account Type</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{role}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold text-xs block">Created At</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{createdAt}</span>
                </div>
              </div>

              {/* Business Details (Read-only for Business accounts) */}
              {role.toLowerCase().includes("business") && (() => {
                const rawBName = (user as any)?.businessName || (user as any)?.businessInfo?.businessName || (user as any)?.kycApplicationData?.businessName;
                const rawBType = (user as any)?.businessType || (user as any)?.businessInfo?.businessType || (user as any)?.businessInfo?.businessIndustry || (user as any)?.kycApplicationData?.businessType;
                const rawPRate = (user as any)?.percentageRate ?? (user as any)?.commissionRate;

                const hasSavedInfo = Boolean(
                  rawBName && rawBName !== "NA" && String(rawBName).trim() !== "" &&
                  rawBType && rawBType !== "NA" && String(rawBType).trim() !== "" && String(rawBType).toLowerCase() !== "select business type"
                );

                const displayBusinessName = hasSavedInfo ? String(rawBName) : "NA";
                const displayBusinessType = hasSavedInfo ? String(rawBType) : "NA";
                const displayCommission = hasSavedInfo
                  ? (rawPRate !== undefined && rawPRate !== null ? `${String(rawPRate).replace('%', '')}%` : "20%")
                  : "0%";

                return (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <h4 className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                      Business Details
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                      <div>
                        <span className="text-slate-400 font-semibold text-xs block">Business Name</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{displayBusinessName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-xs block">Business Type</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{displayBusinessType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold text-xs block">Commission Rate</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{displayCommission}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Status Controls (Strict Finite-State Machine Transition) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-800 dark:text-slate-200 font-bold text-sm block">Account Status Transition</span>
                    <span className="text-slate-400 text-xs">
                      {isAdminOverride
                        ? "Admin Override active: All 8 statuses unlocked with mandatory audit justification."
                        : `Current status: ${currentStatus}. Allowed next states per policy.`}
                    </span>
                  </div>
                  {statusHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowHistory(prev => !prev)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <History className="w-3.5 h-3.5" />
                      {showHistory ? "Hide History" : `History (${statusHistory.length})`}
                    </button>
                  )}
                </div>

                {/* Status Dropdown */}
                {availableStatuses.length === 0 && !isAdminOverride ? (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      <strong>{currentStatus}</strong> is a terminal status with no outgoing transitions permitted by policy. Super Admin Emergency Override is required to alter.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-slate-500 font-medium text-xs block">Target Status</label>
                    <select 
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableStatuses.map(s => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")} {!isAdminOverride && " (Permitted)"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mandatory Reason Input (Image 3) */}
                <div className="space-y-1">
                  <label className="text-slate-500 font-medium text-xs flex items-center justify-between">
                    <span>Reason / Justification <span className="text-red-500 font-bold">*</span></span>
                    {isAdminOverride && <span className="text-amber-600 text-[11px] font-semibold">Min. 5 characters required</span>}
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Provide mandatory reason/trigger for status transition (logged in audit trail)..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
                  />
                </div>

                {/* Super Admin Emergency Override Toggle */}
                {isSuperAdmin && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="admin-override-toggle"
                      checked={isAdminOverride}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsAdminOverride(checked);
                        if (checked && availableStatuses.length > 0) {
                          setSelectedStatus(availableStatuses[0]);
                        }
                      }}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="admin-override-toggle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <strong className="text-slate-900 dark:text-white block font-semibold">Super Admin Emergency Override</strong>
                      Bypass state machine constraints to apply emergency status change. Must provide explicit audit justification.
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleUpdate}
                    disabled={
                      !!updatingAction ||
                      isDeleting ||
                      !selectedStatus ||
                      selectedStatus === currentStatus ||
                      !reason.trim() ||
                      (isAdminOverride && reason.trim().length < 5) ||
                      (availableStatuses.length === 0 && !isAdminOverride)
                    }
                    className="px-6 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    {updatingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Confirm Transition
                  </button>
                </div>
              </div>

              {/* Status History Audit Log (Image 3) */}
              {showHistory && statusHistory.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <h4 className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    Status Audit Trail ({statusHistory.length} events)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {statusHistory.slice().reverse().map((entry, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-slate-800 dark:text-slate-200">
                            {entry.fromStatus ? `${entry.fromStatus} → ` : ""}{entry.status}
                          </span>
                          {entry.isOverride && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">
                              OVERRIDE
                            </span>
                          )}
                        </div>
                        {entry.reason && (
                          <p className="text-slate-600 dark:text-slate-300 italic">
                            "{entry.reason}"
                          </p>
                        )}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>By: {entry.changedBy || "System"}</span>
                          <span>{entry.changedAt ? new Date(entry.changedAt).toLocaleString() : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}

