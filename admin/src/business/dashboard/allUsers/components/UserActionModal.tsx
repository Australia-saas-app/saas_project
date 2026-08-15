"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, X, Shield } from "lucide-react";
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
}

interface UserActionModalProps {
  user: BackendUser | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (userId: string, newStatus: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  token?: string;
}

const statuses = ["ACTIVE", "SUSPENDED", "DORMANT", "CLOSED", "BLOCKED"];

export function UserActionModal({ user, isOpen, onClose, onStatusUpdate, onDelete, token: propToken }: UserActionModalProps) {
  const reduxToken = useAppSelector((state: any) => state.auth.token);
  const token = propToken || reduxToken;
  const [selectedStatus, setSelectedStatus] = useState(user?.status?.toUpperCase() || "ACTIVE");
  const [updatingAction, setUpdatingAction] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bName, setBName] = useState((user as any)?.businessName || user?.fullName || "");
  const [bType, setBType] = useState((user as any)?.businessType || "Technology");
  const [pRate, setPRate] = useState((user as any)?.percentageRate ? String((user as any).percentageRate).replace('%', '') : "20");
  const [isUpdatingBusiness, setIsUpdatingBusiness] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedStatus(user.status?.toUpperCase() || "ACTIVE");
      setBName((user as any)?.businessName || user?.fullName || "");
      setBType((user as any)?.businessType || "Technology");
      setPRate((user as any)?.percentageRate ? String((user as any).percentageRate).replace('%', '') : "20");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const fullName = user.fullName || "User";
  const email = user.email || user.phone || "No Email/Phone";
  const rawRole = String(user.accountType || user.role || "USER");
  const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
  const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "NA";
  const currentStatus = (user.status || "PENDING").toUpperCase();

  const handleUpdate = async () => {
    setUpdatingAction(selectedStatus);
    await onStatusUpdate(user.userId || (user as any).id, selectedStatus);
    toast.success(`Status updated to ${selectedStatus}.`);
    setUpdatingAction('');
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(user.userId || (user as any).id);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    onClose();
  };

  const currentKycStatus = (user.kycStatus || "NONE").toUpperCase();
  const badgeText = currentKycStatus === "APPROVED" ? "Verified" : "Unverified";
  const badgeColors = currentKycStatus === "APPROVED" 
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
        style={{ maxWidth: '600px' }}
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
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">User Overview</h3>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badgeColors}`}>
                  {badgeText}
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
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <span className="text-slate-400 font-semibold text-xs block">Full Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold text-xs block">Email</span>
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

              {/* Business Info Controls (For Business accounts) */}
              {role.toLowerCase().includes("business") && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                      Business Details (Live DB)
                    </span>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      Live Profile Data
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 font-semibold text-xs block mb-1">Business Name</label>
                      <input
                        type="text"
                        value={bName}
                        onChange={(e) => setBName(e.target.value)}
                        placeholder="Registered Business Name"
                        className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold text-xs block mb-1">Business Type</label>
                      <select
                        value={bType}
                        onChange={(e) => setBType(e.target.value)}
                        className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                      >
                        <option value="Technology">Technology</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Visa">Visa</option>
                        <option value="Travel">Travel</option>
                        <option value="Careers">Careers</option>
                        <option value="Courses">Courses</option>
                        <option value="Transport">Transport</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold text-xs block mb-1">Commission Rate (%)</label>
                      <input
                        type="number"
                        value={pRate}
                        onChange={(e) => setPRate(e.target.value)}
                        placeholder="20"
                        min="0"
                        max="100"
                        className="w-full h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isUpdatingBusiness}
                      onClick={async () => {
                        setIsUpdatingBusiness(true);
                        try {
                          const res = await fetch(`/admin/api/sso/auth/admin/users/${user.userId || (user as any).id}/business-info`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              "Authorization": `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              businessName: bName,
                              businessType: bType,
                              percentageRate: Number(pRate) || 20,
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to update business info");
                          toast.success("Business details updated in live database");
                          window.dispatchEvent(new CustomEvent("vero:account_changed"));
                          onClose();
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to update business info");
                        } finally {
                          setIsUpdatingBusiness(false);
                        }
                      }}
                      className="px-4 h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isUpdatingBusiness ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Business Details"}
                    </button>
                  </div>
                </div>
              )}

              {/* Status Controls */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 font-semibold text-xs block mb-2">Change Account Status</span>
                <div className="flex items-center gap-3">
                  <select 
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="flex-1 h-10 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none"
                  >
                    {statuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdate}
                    disabled={!!updatingAction || isDeleting}
                    className="px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {updatingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </button>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}
