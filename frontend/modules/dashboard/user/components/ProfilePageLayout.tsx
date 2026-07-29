"use client";

import { useRef, useState } from "react";
import { CheckCircle, Clock, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import ProfileFormGrid from "../../shared/components/profile/ProfileFormGrid";
import DocumentCards from "../../shared/components/profile/DocumentCards";
import KycApplicationModal from "../../shared/components/profile/KycApplicationModal";
import { useProfileDisplay } from "../../shared/hooks/use-profile-display";

export default function ProfilePageLayout() {
  const { rawUserId, displayUserId, fullName, email, joiningDate, avatarUrl, updateProfile, isActive, isKycVerified, kycStatus, documentUrl, documentFrontUrl, documentBackUrl, phone, dateOfBirth, nationality, nationalIdentity } = useProfileDisplay();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [docRevision, setDocRevision] = useState(0);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const handleApplyKycClick = () => {
    if (kycStatus === "pending" || kycStatus === "submitted" || isKycVerified) {
      setIsKycModalOpen(true);
      return;
    }

    const missingFields: string[] = [];
    if (!fullName) missingFields.push("Full Name");
    if (!phone) missingFields.push("Phone");
    if (!dateOfBirth) missingFields.push("Date of Birth");
    if (!nationality) missingFields.push("Nationality");
    if (!nationalIdentity) missingFields.push("National Identity");
    if (!documentFrontUrl) missingFields.push("Front ID Document");
    if (!documentBackUrl) missingFields.push("Back ID Document");
    if (!avatarUrl) missingFields.push("Profile Photo");

    if (missingFields.length > 0) {
      toast.error(`Please complete the following fields before applying for KYC: ${missingFields.join(', ')}`);
      return;
    }

    setIsKycModalOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      updateProfile({ avatarUrl: result });
      toast.success("Profile picture updated.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="w-full space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {kycStatus === 'rejected' && (
          <div className="mx-6 mt-6 mb-0 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">Account Unverified by Admin</h4>
                <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/90">
                  Your KYC application was rejected. Please review your personal information and re-upload a clear document if needed, then re-apply for KYC.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Top Header Section */}
        <div className="flex flex-col items-start justify-between gap-4 border-b border-border p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            {/* Avatar Container with Bottom-Right Pencil Icon */}
            <div className="relative h-20 w-20 shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20 bg-muted shadow-sm">
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              </div>
              {/* Pencil Icon Button */}
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                title="Change profile photo"
                className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all border border-background"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name, Status, Date & Email */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{fullName}</h2>
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                  isActive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                  {isActive ? "Active" : "Pending"}
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Joining date — <span className="text-foreground/80">{joiningDate}</span>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{email}</p>
            </div>
          </div>

          {/* Top Right Header Actions */}
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              {isKycVerified ? (
                <span className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Verified Account
                </span>
              ) : kycStatus === "pending" || kycStatus === "submitted" ? (
                <span className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending Verification
                </span>
              ) : (
                <span className="flex items-center gap-2 rounded-lg bg-slate-500/10 border border-slate-500/20 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  Unverified Account
                </span>
              )}
            </div>
            
            <button 
              type="button"
              onClick={handleApplyKycClick}
              className="mt-1 w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              {isKycVerified ? "View Application" : kycStatus === "pending" || kycStatus === "submitted" ? "View Application" : "Apply KYC"}
            </button>

            {(kycStatus === 'pending' || kycStatus === 'submitted' || isKycVerified || kycStatus === 'rejected') && (
              <div className={`mt-1 w-full sm:w-auto px-4 py-2 rounded-md flex items-center justify-center gap-2 border ${
                isKycVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                : kycStatus === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
                <span className="font-bold text-[11px] uppercase tracking-wider">Status:</span>
                <span className="font-black text-xs uppercase tracking-wider">
                  {isKycVerified ? 'Approved' : kycStatus === 'rejected' ? 'Rejected' : 'Pending'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Interactive Form Grid */}
        <ProfileFormGrid onDocumentChange={() => setDocRevision((r) => r + 1)} />

        {/* Document Cards - revision triggers re-read from storage */}
        <div className="border-t border-border">
          <DocumentCards
            userId={rawUserId}
            revision={docRevision}
            onRemove={() => setDocRevision((r) => r + 1)}
          />
        </div>
      </div>
      <KycApplicationModal 
        isOpen={isKycModalOpen} 
        onClose={() => setIsKycModalOpen(false)}
        kycStatus={kycStatus}
        isKycVerified={isKycVerified}
        onSuccess={() => window.location.reload()}
        user={{
          rawUserId,
          displayUserId,
          fullName,
          email,
          nationality,
          dateOfBirth,
          nationalIdentity,
          avatarUrl,
          documentUrl,
          documentFrontUrl,
          documentBackUrl
        }}
      />
    </div>
  );
}
