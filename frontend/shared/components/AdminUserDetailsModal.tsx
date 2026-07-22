"use client";

import React, { useState } from "react";
import { X, CheckCircle, ShieldAlert, User, Mail, Shield, Globe, Calendar, FileText, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getProfileOverrides, saveProfileOverrides } from "@/src/shared/utils/profile-storage";
import { completeUserProfile } from "@/src/shared/server/AuthService";

export interface AdminUserDetailData {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  displayId?: string;
  nationality?: string;
  dateOfBirth?: string;
  nationalIdentity?: string;
  documentUrl?: string;
  status?: string;
}

interface AdminUserDetailsModalProps {
  open: boolean;
  onClose: () => void;
  user: AdminUserDetailData | null;
  onStatusChange?: (newStatus: "active" | "pending") => void;
}

export function AdminUserDetailsModal({ open, onClose, user, onStatusChange }: AdminUserDetailsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open || !user) return null;

  // Retrieve stored overrides for this user
  const overrides = getProfileOverrides(user.userId);
  const fullName = overrides.fullName || user.fullName || "User";
  const email = overrides.email || user.email || "";
  const role = user.role || "USER";
  const displayId = user.displayId || user.userId || "USR-01";
  const nationality = overrides.nationality || user.nationality || "Not specified";
  const dateOfBirth = overrides.dateOfBirth || user.dateOfBirth || "Not specified";
  const nationalIdentity = overrides.nationalIdentity || user.nationalIdentity || "Not specified";
  const documentUrl = overrides.documentUrl || user.documentUrl || "";
  const currentStatus = String(overrides.status || user.status || "pending").toLowerCase();
  const isVerified = currentStatus === "active" || currentStatus === "verified" || currentStatus === "approved";
  
  // Unverified by admin lock state: disabled until user re-submits profile & document
  const isUnverifiedLocked = Boolean(overrides.unverifiedByAdmin && !overrides.resubmitted && !isVerified);

  const handleUpdateStatus = async (newStatus: "active" | "pending") => {
    setIsSubmitting(true);
    try {
      if (newStatus === "pending") {
        // Mark as unverified by admin and lock buttons until user re-updates document
        saveProfileOverrides(user.userId, {
          status: "pending",
          unverifiedByAdmin: true,
          resubmitted: false,
        });
      } else {
        // Mark as verified & active
        saveProfileOverrides(user.userId, {
          status: "active",
          unverifiedByAdmin: false,
          resubmitted: false,
        });
      }

      // 2. Call backend DB endpoint if applicable
      await completeUserProfile({
        userId: user.userId,
        status: newStatus,
      }).catch(() => undefined);

      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      if (newStatus === "active") {
        toast.success(`Account ${displayId} verified & activated successfully!`);
      } else {
        toast.warning(`Account ${displayId} marked as Unverified (Pending). Verification buttons are now disabled until user re-submits profile & document.`);
      }
      onClose();
    } catch {
      toast.error("Failed to update user status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {fullName}
                <span className="text-xs font-semibold text-muted-foreground">({displayId})</span>
              </h3>
              <p className="text-xs text-muted-foreground">User Verification & Profile Details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Badge Indicator */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Verification Status
            </span>
            <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
              isVerified
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}>
              <span className={`h-2 w-2 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
              {isVerified ? "Verified (Active)" : "Pending Verification"}
            </span>
          </div>

          {/* User Detail Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Full Name</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {fullName}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Email Address</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-2 truncate">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {email}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Account Role</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {role.toUpperCase()}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Nationality</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {nationality}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Date of Birth</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {dateOfBirth}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">National Identity Number</span>
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {nationalIdentity}
              </span>
            </div>
          </div>

          {/* Document Preview Section */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Identity Document / Passport Preview
            </span>
            {documentUrl ? (
              <div className="rounded-xl border border-border overflow-hidden bg-muted/20 p-3">
                <img
                  src={documentUrl}
                  alt="Identity Document"
                  className="w-full max-h-64 object-contain rounded-lg border border-border bg-black/5"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground bg-muted/10 flex flex-col items-center gap-2">
                <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
                <span className="text-xs font-medium">No document uploaded yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions (Verify / Unverify) */}
        <div className="flex flex-col gap-3 p-5 border-t border-border bg-muted/20">
          {isUnverifiedLocked && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium text-center">
              * Account is Unverified (Pending). Verification buttons are disabled until the user re-checks profile & uploads a new document.
            </p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleUpdateStatus("pending")}
              disabled={isUnverifiedLocked || isSubmitting}
              className="flex-1 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="h-4 w-4" /> Unverify (Pending)
            </button>
            <button
              type="button"
              onClick={() => handleUpdateStatus("active")}
              disabled={isUnverifiedLocked || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-4 w-4" /> Verify (Activate)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUserDetailsModal;
