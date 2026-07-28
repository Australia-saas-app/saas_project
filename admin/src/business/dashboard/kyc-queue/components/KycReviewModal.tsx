"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, X, FileText, CheckCircle, ZoomIn, ZoomOut, RotateCcw, ShieldAlert } from "lucide-react";
import { useAppSelector } from "@/src/core/store/hooks";

interface KycReviewModalProps {
  user: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function KycReviewModal({ user, isOpen, onClose, onSuccess }: KycReviewModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const token = useAppSelector((state) => state.auth.token);

  useEffect(() => {
    if (!isOpen) {
      setZoomScale(1);
      setImagePreviewOpen(false);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const fullName = user.fullName || "User";
  const email = user.email || user.phone || "No Email/Phone";
  const role = String(user.accountType || user.role || "USER").toUpperCase();
  const nationality = user.nationality || "NA";
  const dateOfBirth = user.dateOfBirth || "NA";
  const nationalIdentity = user.governmentId || user.nationalIdentity || "NA";
  const documentUrl = user.idDocument || user.documentUrl || "";
  const avatarUrl = user.avatarUrl || user.profilePhoto || "";
  
  const handleApprove = async () => {
    if (!token) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/admin/api/sso/auth/admin/users/${user.userId || user.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'ACTIVE' })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      toast.success(`Account Verified — ${fullName} is now Active.`);
      onSuccess();
    } catch (error) {
      toast.error('Failed to approve KYC');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
        <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review KYC Application</h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Account Summary Header */}
            <div className="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-lg flex-shrink-0 overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <span>{fullName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 dark:text-white truncate text-base">{fullName}</div>
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
                <div 
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => setImagePreviewOpen(true)}
                >
                  <img src={documentUrl} alt="Document" className="w-full h-40 object-cover" />
                  <div className="p-2 text-center text-xs font-semibold text-blue-600 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    Click to Enlarge
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-5 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 text-xs font-medium">
                  No Document Uploaded
                </div>
              )}
            </div>

            {/* Approve Button */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleApprove}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 h-10 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-all text-sm disabled:opacity-50"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approve & Verify Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {imagePreviewOpen && documentUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl p-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" /> Identity Document
              </h4>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
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
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1"
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
