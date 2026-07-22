"use client";

import { useRef } from "react";
import { CheckCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import ProfileFormGrid from "./ProfileFormGrid";
import DocumentCards, { DocumentUploadButton } from "./DocumentCards";
import LevelProgressSection from "./LevelProgressSection";
import { addProfileDocument } from "@/src/shared/utils/profile-storage";
import { useProfileDisplay } from "../../hooks/use-profile-display";

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
  const { rawUserId, fullName, email, joiningDate, avatarUrl, updateProfile, isVerified } =
    useProfileDisplay();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col border-b border-border p-6 pb-6 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-6 lg:flex-row">
          <div className="flex items-start gap-5">
            {/* Avatar Container with Pencil Icon */}
            <div className="relative h-20 w-20 shrink-0 md:h-[85px] md:w-[85px]">
              <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-primary/20 bg-muted shadow-sm">
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
                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                  isVerified
                    ? "border-emerald-500/20 bg-emerald-500/10"
                    : "border-amber-500/20 bg-amber-500/10"
                }`}>
                  <div className={`h-2 w-2 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                  <span className={`text-[11px] font-bold ${
                    isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                  }`}>
                    {isVerified ? "Active" : "Pending"}
                  </span>
                </div>
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Verified Account
              </div>
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
                    addProfileDocument(rawUserId, {
                      id: `doc-${Date.now()}`,
                      type: "UPLOADED",
                      name: file.name,
                      sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                      uploadedAt: new Date().toLocaleDateString(),
                      previewText: `Uploaded: ${file.name}`,
                    });
                    toast.success(`${file.name} uploaded successfully.`);
                    e.target.value = "";
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
            onUpload={(doc) => {
              addProfileDocument(rawUserId, doc);
              toast.success(`${doc.name} added to your documents.`);
            }}
          />
        </div>
      )}
    </div>
  );
}
