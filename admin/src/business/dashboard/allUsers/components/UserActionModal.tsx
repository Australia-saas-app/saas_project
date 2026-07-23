"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, X, AlertTriangle, CheckCircle, ShieldAlert, FileText, Globe, Calendar, User, Mail, Shield, Eye, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface BackendUser {
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountType?: string;
  status?: string;
  createdAt?: string;
  nationality?: string;
  dateOfBirth?: string;
  nationalIdentity?: string;
  governmentId?: string;
  idDocument?: string;
  documentUrl?: string;
  documentName?: string;
  avatarUrl?: string;
}

interface UserProfile {
  nationality?: string;
  dateOfBirth?: string;
  nationalIdentity?: string;
  governmentId?: string;
  idDocument?: string;
  documentUrl?: string;
  documentName?: string;
  avatarUrl?: string;
  fullName?: string;
}

interface UserActionModalProps {
  user: BackendUser | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (userId: string, newStatus: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  token?: string;
}

const statuses = ["ACTIVE", "PENDING", "SUSPENDED", "DORMANT", "CLOSED", "BLOCKED"];

export function UserActionModal({ user, isOpen, onClose, onStatusUpdate, onDelete, token: propToken }: UserActionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(user?.status?.toUpperCase() || "ACTIVE");
  const [updatingAction, setUpdatingAction] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

  useEffect(() => {
    if (user) setSelectedStatus(user.status?.toUpperCase() || "ACTIVE");
  }, [user]);

  // Fetch full profile from backend when modal opens
  useEffect(() => {
    if (!isOpen || !user?.userId) return;
    setFetchedProfile(null);
    setIsFetchingProfile(true);
    // Use token passed as prop (from Redux in AllUserTable), fall back to localStorage
    const token = propToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");
    fetch(`/admin/api/sso/auth/admin/users/${user.userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((res) => {
        if (res) {
          // Backend returns { success: true, data: { ...user fields } }
          const d = res?.data || res;
          setFetchedProfile({
            fullName: d.fullName,
            nationality: d.nationality,
            dateOfBirth: d.dateOfBirth,
            nationalIdentity: d.governmentId || d.nationalIdentity || d.identityNumber,
            governmentId: d.governmentId,
            idDocument: d.idDocument || d.documentUrl,
            documentUrl: d.idDocument || d.documentUrl,
            documentName: d.documentName || (d.idDocument ? "Identity Document" : undefined),
            avatarUrl: d.profilePhoto || d.avatarUrl,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingProfile(false));
  }, [isOpen, user?.userId]);

  if (!isOpen || !user) return null;

  // Retrieve any overrides from local storage if running unified
  let storedOverrides: Record<string, any> = {};
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("user_profile_overrides_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        storedOverrides = parsed[user.userId] || {};
      }
    } catch {}
  }

  // Priority: fetchedProfile (from backend API) > user object > localStorage overrides
  const fullName = fetchedProfile?.fullName || user.fullName || storedOverrides.fullName || "User";
  const email = user.email || user.phone || "No Email/Phone";
  const role = String(user.accountType || user.role || "USER").toUpperCase();
  
  let prefix = "USR-";
  if (role.includes("AGENCY") || role.includes("AFFILIATE")) prefix = "AFF-";
  else if (role.includes("BUSINESS") || role.includes("SELLER")) prefix = "BSN-";
  
  const rawIdDigits = user.userId ? user.userId.replace(/\D/g, "") : "1";
  const val = parseInt(rawIdDigits.slice(-4), 10) || 1;
  const displayId = user.userId && (user.userId.startsWith("USR-") || user.userId.startsWith("AFF-") || user.userId.startsWith("BSN-"))
    ? user.userId
    : `${prefix}${val < 10 ? `0${val}` : `${val}`}`;

  const nationality = fetchedProfile?.nationality || user.nationality || storedOverrides.nationality || "NA";
  const dateOfBirth = fetchedProfile?.dateOfBirth || user.dateOfBirth || storedOverrides.dateOfBirth || "NA";
  const nationalIdentity = fetchedProfile?.nationalIdentity || fetchedProfile?.governmentId || user.governmentId || user.nationalIdentity || storedOverrides.nationalIdentity || "NA";
  const documentUrl = fetchedProfile?.idDocument || fetchedProfile?.documentUrl || user.idDocument || user.documentUrl || storedOverrides.documentUrl || "";

  const currentStatus = (user.status || storedOverrides.status || "PENDING").toUpperCase();

  const handleUpdate = async (newStatus?: string) => {
    const targetStatus = newStatus || selectedStatus;
    setUpdatingAction(targetStatus);

    await onStatusUpdate(user.userId, targetStatus);

    if (targetStatus === "PENDING") {
      toast.warning(`Account Unverified — ${fullName} has been set to Pending.`);
    } else if (targetStatus === "ACTIVE") {
      toast.success(`Account Verified — ${fullName} is now Active.`);
    } else {
      toast.success(`Status updated to ${targetStatus}.`);
    }

    setUpdatingAction('');
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(user.userId);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
        <div 
          className="relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
          style={{ maxWidth: showDeleteConfirm ? "400px" : "550px" }}
        >
          {showDeleteConfirm ? (
            <div className="p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete User?</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm leading-relaxed">
                Are you sure you want to permanently delete <span className="font-semibold">{fullName}</span> ({displayId})? All user data, credentials, recovery keys, and documents will be permanently cleared.
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
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Profile & Verification</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    {displayId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
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
                {isFetchingProfile && (
                  <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading profile data…
                  </div>
                )}
                {/* Account Summary Header */}
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                    {fetchedProfile?.avatarUrl || user.avatarUrl ? (
                      <img
                        src={fetchedProfile?.avatarUrl || user.avatarUrl}
                        alt={fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span>{fullName ? fullName.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate text-base">{fullName}</div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        currentStatus === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      }`}>
                        {currentStatus}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</div>
                  </div>
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Role</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{role}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Nationality</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{nationality}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Date of Birth</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{dateOfBirth}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">National Identity</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{nationalIdentity}</span>
                  </div>
                </div>

                {/* Document Preview Section */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Identity Document / Passport
                  </span>
                  {documentUrl ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {fetchedProfile?.documentName || user.documentName || "Identity Document"}
                          </p>
                          <p className="text-[10px] text-slate-400">Uploaded document</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImagePreviewOpen(true)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shrink-0"
                        title="Preview Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-5 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 text-xs font-medium">
                      No Document Uploaded Yet
                    </div>
                  )}
                </div>

                {/* Verify / Unverify & Status Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  {currentStatus !== "ACTIVE" ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleUpdate("ACTIVE")}
                        disabled={!!updatingAction || isDeleting}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs disabled:opacity-50"
                      >
                        {updatingAction === 'ACTIVE' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Verify (Activate)
                      </button>
                      <button
                        onClick={() => handleUpdate("PENDING")}
                        disabled={!!updatingAction || isDeleting}
                        className="flex-1 flex items-center justify-center gap-2 h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition-all text-xs disabled:opacity-50"
                      >
                        {updatingAction === 'PENDING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                        Unverify (Pending)
                      </button>
                    </div>
                  ) : (
                    /* Status Dropdown ONLY shown AFTER account is verified */
                    <div className="pt-2 flex items-center gap-3">
                      <div className="flex-1">
                        <select 
                          value={selectedStatus}
                          onChange={(e) => setSelectedStatus(e.target.value)}
                          className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                        >
                          {statuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => handleUpdate(selectedStatus)}
                        disabled={!!updatingAction || isDeleting}
                        className="px-4 h-9 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {updatingAction === selectedStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update Status"}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Full Image Preview Modal with Zoom Controls */}
      {imagePreviewOpen && documentUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-5 flex flex-col items-center">
            {/* Header & Zoom Controls Toolbar */}
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Identity Document / Passport Preview
              </h4>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-300 min-w-[45px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(3, z + 0.25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setImagePreviewOpen(false);
                    setZoomScale(1);
                  }}
                  className="p-1.5 text-white/70 hover:text-white bg-red-600/80 hover:bg-red-600 rounded-lg transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zoomable Image Container */}
            <div className="w-full max-h-[70vh] overflow-auto flex items-center justify-center p-2 rounded-xl bg-black/40">
              <img
                src={documentUrl}
                alt="Document Full View"
                style={{ transform: `scale(${zoomScale})`, transition: "transform 0.15s ease-out" }}
                className="max-h-[65vh] object-contain rounded-lg shadow-lg origin-center"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default UserActionModal;
