"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProfileFormGrid from "../../shared/components/profile/ProfileFormGrid";
import DocumentCards from "../../shared/components/profile/DocumentCards";
import KycApplicationModal from "../../shared/components/profile/KycApplicationModal";
import { useProfileDisplay, getStatusBadgeStyle } from "../../shared/hooks/use-profile-display";
import { getProfileOverrides } from "@/src/shared/utils/profile-storage";
import { useUser } from "@/src/shared/context/user.provider";

export default function ProfilePageLayout() {
  const { refreshUser } = useUser() || {};
  const { rawUserId, displayUserId, fullName, email, joiningDate, avatarUrl, hasCustomAvatar, updateProfile, isActive, isKycVerified, kycStatus, status, documentUrl, documentFrontUrl, documentBackUrl, phone, dateOfBirth, nationality, gender, nationalIdentity, permanentAddress, kycApplicationData } = useProfileDisplay();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [docRevision, setDocRevision] = useState(0);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const effectiveKycStatus = kycStatus;
  const effectiveIsKycVerified = kycStatus === 'approved';

  const handleApplyKycClick = () => {
    if (effectiveKycStatus === "pending" || effectiveKycStatus === "submitted" || effectiveIsKycVerified) {
      setIsKycModalOpen(true);
      return;
    }

    const missingFields: string[] = [];
    if (!fullName) missingFields.push("Full Name");
    if (!phone && !email) missingFields.push("Phone or Email");
    if (!dateOfBirth) missingFields.push("Date of Birth");
    if (!nationality) missingFields.push("Nationality");
    if (!nationalIdentity) missingFields.push("National Identity");
    if (!documentFrontUrl) missingFields.push("ID Document");
    if (!hasCustomAvatar) missingFields.push("Profile Photo");

    if (missingFields.length > 0) {
      toast.error(`Please complete the following fields before applying for KYC: ${missingFields.join(', ')}`);
      return;
    }

    setIsKycModalOpen(true);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error("Please select a JPG, JPEG, or PNG image file.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
      const compressedBase64 = await compressImageFile(file, 400, 400, 0.6);
      
      await updateProfile({ avatarUrl: compressedBase64 });
      if (refreshUser) {
        await refreshUser().catch(() => {});
      }
      setIsUploadingAvatar(false);
      toast.success("Profile picture updated.");
    } catch (error: any) {
      setIsUploadingAvatar(false);
      toast.error(error?.message || "Failed to save profile picture.");
    }
    e.target.value = "";
  };

  return (
    <div className="w-full space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {effectiveKycStatus === 'rejected' && (
          <div className="mx-6 mt-6 mb-0 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-400">KYC Application Rejected</h4>
                <p className="mt-1 text-sm text-red-600/90 dark:text-red-300/90">
                  Your KYC application was rejected. Please review your information and re-upload a clear document, then re-apply.
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
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/20 bg-muted shadow-sm relative">
                {isUploadingAvatar && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white">
                    <Loader2 className="w-5 h-5 animate-spin mb-1 text-white" />
                    <span className="text-[9px] font-medium leading-none">Uploading...</span>
                  </div>
                )}
                <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
              </div>
              {/* Pencil Icon Button */}
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                title="Change profile photo"
                className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all border border-background"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Name, Status, Date & Email */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{fullName}</h2>
                {(() => {
                  const style = getStatusBadgeStyle(status || "active");
                  return (
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${style.pill}`}>
                      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                      {style.label}
                    </span>
                  );
                })()}
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
              {effectiveIsKycVerified ? (
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Unverified
                </span>
              )}
            </div>
            
            <button 
              type="button"
              onClick={handleApplyKycClick}
              className="mt-1 w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all"
            >
              {effectiveIsKycVerified || effectiveKycStatus === "pending" || effectiveKycStatus === "submitted" ? "View Application" : effectiveKycStatus === "rejected" ? "Re Apply KYC" : "Apply KYC"}
            </button>

            {(effectiveKycStatus === 'pending' || effectiveKycStatus === 'submitted' || effectiveIsKycVerified || effectiveKycStatus === 'rejected') && (
              <div className={`mt-1 w-full sm:w-auto px-4 py-2 rounded-md flex items-center justify-center gap-2 border ${
                effectiveIsKycVerified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                : effectiveKycStatus === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
                <span className="font-bold text-[11px] uppercase tracking-wider">Status:</span>
                <span className="font-black text-xs uppercase tracking-wider">
                  {effectiveIsKycVerified ? 'Approved' : effectiveKycStatus === 'rejected' ? 'Rejected' : 'Pending'}
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
            dbDocumentUrl={documentUrl}
            revision={docRevision}
            onRemove={() => setDocRevision((r) => r + 1)}
          />
        </div>
      </div>
      <KycApplicationModal 
        isOpen={isKycModalOpen} 
        onClose={() => setIsKycModalOpen(false)}
        kycStatus={effectiveKycStatus}
        isKycVerified={effectiveIsKycVerified}
        onSuccess={async () => {
          await updateProfile({ kycStatus: "pending" });
          if (refreshUser) await refreshUser().catch(() => {});
        }}
        user={{
          rawUserId,
          displayUserId,
          fullName,
          email,
          nationality,
          dateOfBirth,
          gender,
          nationalIdentity,
          governmentIdType: (getProfileOverrides(rawUserId) as any).governmentIdType,
          permanentAddress,
          avatarUrl,
          profilePhoto: avatarUrl,
          documentUrl,
          documentFrontUrl,
          documentBackUrl,
          kycApplicationData
        }}
      />
    </div>
  );
}
