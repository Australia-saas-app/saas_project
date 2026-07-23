"use client";

import { useRef, useState } from "react";
import { CheckCircle, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";
import ProfileFormGrid from "../../shared/components/profile/ProfileFormGrid";
import DocumentCards from "../../shared/components/profile/DocumentCards";
import { useProfileDisplay } from "../../shared/hooks/use-profile-display";

export default function ProfilePageLayout() {
  const { rawUserId, fullName, email, joiningDate, avatarUrl, updateProfile, isVerified, status } = useProfileDisplay();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [docRevision, setDocRevision] = useState(0);

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
                <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  isVerified
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                  {isVerified ? "Active" : "Pending"}
                </span>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Joining date — <span className="text-foreground/80">{joiningDate}</span>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{email}</p>
            </div>
          </div>

          {/* Top Right Header Actions */}
          <div className="flex items-center gap-3">
            {isVerified ? (
              <span className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Verified Account
              </span>
            ) : (
              <span className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                Pending Verification
              </span>
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
    </div>
  );
}
