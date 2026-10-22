"use client";

import { useRef, useState, useEffect } from "react";
import { ShieldCheck, Pencil, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProfileFormGrid from "./ProfileFormGrid";
import KycApplicationModal from "./KycApplicationModal";
import LiveKycCaptureModal from "./LiveKycCaptureModal";
import DocumentCards, { DocumentUploadButton } from "./DocumentCards";
import LevelProgressSection from "./LevelProgressSection";
import { addProfileDocument, saveProfileOverrides, getProfileOverrides } from "@/src/shared/utils/profile-storage";
import { useProfileDisplay, getStatusBadgeStyle } from "../../hooks/use-profile-display";
import { useUser } from "@/src/context/user.provider";

export interface ProfileStat {
  label: string;
  value: string;
}

export interface RoleProfileCardProps {
  accountLabel?: string;
  stats?: ProfileStat[];
  levelProgress?: {
    completedLabel: string;
    fillPercent: number;
    milestones: string[];
    completedCount: number;
  };
  showDocumentButton?: boolean;
  showDocuments?: boolean;
}

export default function RoleProfileCard({
  stats,
  levelProgress,
  showDocumentButton = false,
  showDocuments = false,
}: RoleProfileCardProps) {
  const { rawUserId, fullName, email, joiningDate, avatarUrl, hasCustomAvatar, updateProfile, isActive, isKycVerified, kycStatus, status, documentUrl, documentFrontUrl, documentBackUrl, phone, dateOfBirth, nationality, gender, nationalIdentity, permanentAddress, kycApplicationData } =
    useProfileDisplay();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isLiveCaptureOpen, setIsLiveCaptureOpen] = useState(false);
  const [liveCapturedPhoto, setLiveCapturedPhoto] = useState<string | null>(null);
  const { user, refreshUser } = useUser();

  const effectiveKycStatus = kycStatus;
  const effectiveIsKycVerified = kycStatus === 'approved';

  const handleApplyKycClick = () => {
    // If already submitted / approved, open view mode directly
    if (effectiveKycStatus === "pending" || effectiveKycStatus === "submitted" || effectiveIsKycVerified) {
      setIsKycModalOpen(true);
      return;
    }

    // Validate if profile and ID documents are complete (Profile Photo is captured live via biometric camera)
    const missingFields: string[] = [];
    if (!fullName) missingFields.push("Full Name");
    if (!phone && !email) missingFields.push("Phone or Email");
    if (!gender || gender === "Select") missingFields.push("Gender");
    if (!dateOfBirth) missingFields.push("Date of Birth");
    if (!nationality) missingFields.push("Nationality");
    if (!nationalIdentity) missingFields.push("National Identity");
    if (!documentFrontUrl) missingFields.push("ID Document Front");
    if (!documentBackUrl) missingFields.push("ID Document Back");

    const isBusiness = String((user as any)?.accountType || (user as any)?.role || "").toLowerCase().includes("business");
    if (isBusiness) {
      const bName = (user as any)?.businessName || (user as any)?.businessInfo?.businessName;
      const bType = (user as any)?.businessType || (user as any)?.businessInfo?.businessIndustry;
      if (!bName || !bName.trim()) missingFields.push("Business Name");
      if (!bType || !bType.trim()) missingFields.push("Business Type");
    }

    if (missingFields.length > 0) {
      toast.error(`Please complete the following fields before applying for KYC: ${missingFields.join(', ')}`);
      return;
    }

    // Open Live Biometric Face Detection Modal
    setLiveCapturedPhoto(null);
    setIsLiveCaptureOpen(true);
  };

  const handleLiveCaptureComplete = (photoBase64: string) => {
    setLiveCapturedPhoto(photoBase64);
    setIsLiveCaptureOpen(false);
    setIsKycModalOpen(true);
  };

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
      const compressedBase64 = await compressImageFile(file, 400, 400, 0.6);
      await updateProfile({ avatarUrl: compressedBase64 });
      setIsUploadingAvatar(false);
      toast.success("Profile picture updated.");
    } catch (e) {
      setIsUploadingAvatar(false);
      toast.error("Failed to process image.");
    }
    e.target.value = "";
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
      <div className="flex flex-col border-b border-border p-6 pb-6 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-6 lg:flex-row">
          <div className="flex items-start gap-5">
            {/* Avatar Container with Pencil Icon */}
            <div className="relative h-20 w-20 shrink-0 md:h-[85px] md:w-[85px]">
              <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-primary/20 bg-muted shadow-sm relative">
                {isUploadingAvatar && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white">
                    <Loader2 className="w-5 h-5 animate-spin mb-1 text-white" />
                    <span className="text-[9px] font-medium leading-none">Uploading...</span>
                  </div>
                )}
                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
              </div>
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

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-bold text-foreground">{fullName}</h3>
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
              <div className="text-xs font-medium text-muted-foreground">
                Joining date — <span className="text-foreground/80">{joiningDate}</span>
              </div>
              <div className="text-xs font-medium text-muted-foreground">{email}</div>
              {stats && stats.length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-4 md:gap-6">
                  {stats.map((stat, index) => (
                    <div key={stat.label} className="flex items-center gap-4 md:gap-6">
                      {index > 0 && <div className="hidden h-8 w-px bg-border sm:block" />}
                      <div className="flex flex-col">
                        <span className="mb-0.5 text-[11px] font-medium text-muted-foreground">
                          {stat.label}
                        </span>
                        <span className="text-sm font-medium text-foreground">{stat.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Right Header Actions (Top edit button REMOVED) */}
          <div className="flex flex-col items-start justify-between gap-4 lg:items-end">
            <div className="flex flex-col items-end gap-3">
              {effectiveIsKycVerified ? (
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </div>
              ) : effectiveKycStatus === "pending" || effectiveKycStatus === "submitted" ? (
                <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  Pending Verification
                </div>
              ) : effectiveKycStatus === "rejected" ? (
                <div className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Rejected KYC
                </div>
              ) : (
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Unverified
                </div>
              )}
              
              <button 
                type="button"
                onClick={handleApplyKycClick}
                className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all"
              >
                {effectiveIsKycVerified ? "View Application" : effectiveKycStatus === "pending" || effectiveKycStatus === "submitted" ? "View Application" : effectiveKycStatus === "rejected" ? "Re Apply KYC" : "Apply KYC"}
              </button>
            </div>
            {showDocumentButton && (
              <>
                <input
                  ref={docUploadRef}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const reader = new FileReader();
                    reader.onload = async () => {
                      let result = typeof reader.result === "string" ? reader.result : "";
                      try {
                        const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
                        result = await compressImageFile(file, 800, 800, 0.7);
                      } catch (e) {
                        console.error("Image compression failed", e);
                      }
                      addProfileDocument(rawUserId, {
                        id: `doc-${Date.now()}`,
                        type: "UPLOADED",
                        name: file.name,
                        sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                        uploadedAt: new Date().toLocaleDateString(),
                        previewText: `Uploaded: ${file.name}`,
                        url: result
                      });
                      updateProfile({ documentUrl: result });
                      toast.success(`${file.name} uploaded successfully.`);
                      e.target.value = "";
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <DocumentUploadButton onClick={() => docUploadRef.current?.click()} />
              </>
            )}
          </div>
        </div>

        {levelProgress && (
          <LevelProgressSection
            completedLabel={levelProgress.completedLabel}
            fillPercent={levelProgress.fillPercent}
            milestones={levelProgress.milestones}
            completedCount={levelProgress.completedCount}
          />
        )}
      </div>

      {/* Interactive Profile Form */}
      <ProfileFormGrid />

      {showDocuments && (
        <div className="border-t border-border">
          <DocumentCards
            userId={rawUserId}
            dbDocumentUrl={documentUrl}
            onUpload={(doc) => {
              addProfileDocument(rawUserId, doc);
              if (doc.url) {
                updateProfile({ documentUrl: doc.url });
              }
              toast.success(`${doc.name} added to your documents.`);
            }}
          />
        </div>
      )}

      <LiveKycCaptureModal
        isOpen={isLiveCaptureOpen}
        onClose={() => setIsLiveCaptureOpen(false)}
        onCaptureComplete={handleLiveCaptureComplete}
        userName={fullName}
      />

      <KycApplicationModal 
        isOpen={isKycModalOpen} 
        onClose={() => setIsKycModalOpen(false)}
        kycStatus={effectiveKycStatus}
        isKycVerified={effectiveIsKycVerified}
        initialLivePhoto={liveCapturedPhoto}
        onRetakeLivePhoto={() => {
          setIsKycModalOpen(false);
          setIsLiveCaptureOpen(true);
        }}
        onSuccess={async () => {
          await updateProfile({ kycStatus: "pending" });
          if (refreshUser) await refreshUser().catch(() => {});
        }}
        user={{
          rawUserId,
          displayUserId: rawUserId,
          fullName,
          email,
          nationality,
          dateOfBirth,
          gender,
          nationalIdentity,
          governmentIdType: (getProfileOverrides(rawUserId) as any).governmentIdType,
          permanentAddress,
          avatarUrl: liveCapturedPhoto || avatarUrl,
          documentUrl,
          documentFrontUrl,
          documentBackUrl,
          kycApplicationData
        }}
      />
    </div>
  );
}
