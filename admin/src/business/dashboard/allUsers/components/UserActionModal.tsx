"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Trash2, X, AlertTriangle, CheckCircle, ShieldAlert, FileText, Globe, Calendar, User, Mail, Shield, Eye } from "lucide-react";

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
}

interface UserActionModalProps {
  user: BackendUser | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (userId: string, newStatus: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const statuses = ["ACTIVE", "PENDING", "SUSPENDED", "DORMANT", "CLOSED", "BLOCKED"];

export function UserActionModal({ user, isOpen, onClose, onStatusUpdate, onDelete }: UserActionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(user?.status?.toUpperCase() || "ACTIVE");
  const [updatingAction, setUpdatingAction] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    if (user) setSelectedStatus(user.status?.toUpperCase() || "ACTIVE");
  }, [user]);

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

  const fullName = storedOverrides.fullName || user.fullName || "User";
  const email = storedOverrides.email || user.email || user.phone || "No Email/Phone";
  const role = String(user.accountType || user.role || "USER").toUpperCase();
  
  let prefix = "USR-";
  if (role.includes("AGENCY") || role.includes("AFFILIATE")) prefix = "AFF-";
  else if (role.includes("BUSINESS") || role.includes("SELLER")) prefix = "BSN-";
  
  const rawIdDigits = user.userId ? user.userId.replace(/\D/g, "") : "1";
  const val = parseInt(rawIdDigits.slice(-4), 10) || 1;
  const displayId = user.userId && (user.userId.startsWith("USR-") || user.userId.startsWith("AFF-") || user.userId.startsWith("BSN-"))
    ? user.userId
    : `${prefix}${val < 10 ? `0${val}` : `${val}`}`;

  const nationality = storedOverrides.nationality || user.nationality || "NA";
  const dateOfBirth = storedOverrides.dateOfBirth || user.dateOfBirth || "NA";
  const nationalIdentity = storedOverrides.nationalIdentity || user.governmentId || user.nationalIdentity || "NA";
  const documentUrl = storedOverrides.documentUrl || user.idDocument || user.documentUrl || "";

  const currentStatus = (user.status || storedOverrides.status || "PENDING").toUpperCase();

  const handleUpdate = async (newStatus?: string) => {
    const targetStatus = newStatus || selectedStatus;
    setUpdatingAction(targetStatus);

    // Save unverified flag in storage if set to pending/unverify
    if (typeof window !== "undefined" && targetStatus === "PENDING") {
      try {
        const raw = localStorage.getItem("user_profile_overrides_v2") || "{}";
        const map = JSON.parse(raw);
        map[user.userId] = {
          ...map[user.userId],
          status: "pending",
          unverifiedByAdmin: true,
          resubmitted: false,
        };
        localStorage.setItem("user_profile_overrides_v2", JSON.stringify(map));
      } catch {}
    } else if (typeof window !== "undefined" && targetStatus === "ACTIVE") {
      try {
        const raw = localStorage.getItem("user_profile_overrides_v2") || "{}";
        const map = JSON.parse(raw);
        map[user.userId] = {
          ...map[user.userId],
          status: "active",
          unverifiedByAdmin: false,
          resubmitted: false,
        };
        localStorage.setItem("user_profile_overrides_v2", JSON.stringify(map));
      } catch {}
    }

    await onStatusUpdate(user.userId, targetStatus);
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
                {/* Account Summary Header */}
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
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
                    Identity Document / Passport Preview
                  </span>
                  {documentUrl ? (
                    <div 
                      onClick={() => setImagePreviewOpen(true)}
                      className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/40 p-2 cursor-pointer hover:border-blue-500 transition-all"
                    >
                      <img
                        src={documentUrl}
                        alt="Document Preview"
                        className="w-full max-h-48 object-contain rounded-lg bg-black/5"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold text-xs gap-1.5 rounded-xl">
                        <Eye className="w-4 h-4" /> Click to view full image
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-5 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 text-xs font-medium">
                      No Document Uploaded Yet
                    </div>
                  )}
                </div>

                {/* Verify / Unverify & Status Controls */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
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

                  {/* Status Dropdown after verify / for status override */}
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
                      className="px-4 h-9 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                    >
                      {updatingAction === selectedStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Update Status"}
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {imagePreviewOpen && documentUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-4 flex flex-col items-center">
            <button
              onClick={() => setImagePreviewOpen(false)}
              className="absolute top-3 right-3 p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/70 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" /> Identity Document / Passport Full View
            </h4>
            <img
              src={documentUrl}
              alt="Document Full View"
              className="max-h-[75vh] w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default UserActionModal;
