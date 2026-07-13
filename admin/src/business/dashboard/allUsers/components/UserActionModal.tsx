"use client";

import React, { useState } from "react";
import { Loader2, Trash2, X, AlertTriangle } from "lucide-react";

interface BackendUser {
  userId: string;
  fullName?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
}

interface UserActionModalProps {
  user: BackendUser | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate: (userId: string, newStatus: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const statuses = ["ACTIVE", "PENDING", "SUSPEND", "DORMANT", "CLOSED", "BLOCK"];

export function UserActionModal({ user, isOpen, onClose, onStatusUpdate, onDelete }: UserActionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(user?.status?.toUpperCase() || "ACTIVE");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingAction, setUpdatingAction] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Update local state when user changes
  React.useEffect(() => {
    if (user) setSelectedStatus(user.status?.toUpperCase() || "ACTIVE");
  }, [user]);

  if (!isOpen || !user) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    await onStatusUpdate(user.userId, selectedStatus);
    setIsUpdating(false);
    onClose();
  };

  const handleDelete = async () => {
    if (confirm("Are you sure you want to permanently delete this user?")) {
      setIsDeleting(true);
      await onDelete(user.userId);
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-semibold text-slate-800">Manage Account</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDelete}
              disabled={isDeleting || !!updatingAction}
              className="flex items-center justify-center p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
              title="Delete Account"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          
          <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 truncate">{user.fullName || "Unknown"}</div>
              <div className="text-sm text-slate-500 truncate">{user.email || "No Email"}</div>
              {user.createdAt && (
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  Joined: {new Date(user.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </div>
              )}
            </div>
          </div>

          {user.status?.toUpperCase() === 'PENDING' ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
                <p>This account is currently <b>PENDING</b>. Please review and either approve or block this user.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setUpdatingAction('ACTIVE');
                    await onStatusUpdate(user.userId, 'ACTIVE');
                    setUpdatingAction('');
                    onClose();
                  }}
                  disabled={!!updatingAction || isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
                >
                  {updatingAction === 'ACTIVE' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve Account"}
                </button>
                <button
                  onClick={async () => {
                    setUpdatingAction('BLOCK');
                    await onStatusUpdate(user.userId, 'BLOCK');
                    setUpdatingAction('');
                    onClose();
                  }}
                  disabled={!!updatingAction || isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
                >
                  {updatingAction === 'BLOCK' ? <Loader2 className="w-4 h-4 animate-spin" /> : "Block Account"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Account Status</label>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium text-slate-700 outline-none"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex gap-2">
            <button 
              onClick={onClose}
              disabled={!!updatingAction || isDeleting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {user.status?.toUpperCase() !== 'PENDING' && (
              <button 
                onClick={handleUpdate}
                disabled={!!updatingAction || isDeleting || selectedStatus === user.status?.toUpperCase()}
                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {updatingAction === 'UPDATE' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Update Status
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
