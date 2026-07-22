"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, User, ShieldCheck, FileText, Upload, AlertCircle, ImageIcon, Trash2, Eye, X } from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { useProfileDisplay } from "../../hooks/use-profile-display";
import { ALL_COUNTRIES, ALL_NATIONALITIES, CURRENCY_LIST } from "@/src/shared/constants/countries";
import { markProfileComplete, type ProfileAccountType } from "@/src/shared/lib/profile-completion";
import { accountTypeFromRole } from "@/src/shared/lib/verification-access";
import { completeUserProfile } from "@/src/shared/server/AuthService";
import { getProfileOverrides } from "@/src/shared/utils/profile-storage";
import UploadDocumentModal from "@/src/shared/components/UploadDocumentModal";

export default function ProfileFormGrid() {
  const router = useRouter();
  const { user, refreshUser } = useUser();
  const {
    rawUserId,
    fullName,
    email,
    secondaryEmail: initialSecondaryEmail,
    phone: initialPhone,
    countryCode: initialCountryCode,
    nationality: initialNationality,
    dateOfBirth: initialDateOfBirth,
    nationalIdentity: initialNationalIdentity,
    currency: initialCurrency,
    documentUrl: initialDocumentUrl,
    isVerified,
    updateProfile,
  } = useProfileDisplay();

  const accountType: ProfileAccountType = accountTypeFromRole(user?.role);

  // Form states initialized with user / profile display data
  const [nationality, setNationality] = useState(initialNationality || "");
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth || "");
  const [nationalIdentity, setNationalIdentity] = useState(initialNationalIdentity || "");
  const [countryCode, setCountryCode] = useState(initialCountryCode || "+92");
  const [phone, setPhone] = useState(initialPhone || "");
  const [secondaryEmail, setSecondaryEmail] = useState(initialSecondaryEmail || "");
  const [currency, setCurrency] = useState(initialCurrency || "USD");
  const [documentUrl, setDocumentUrl] = useState(initialDocumentUrl || "");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const overrides = getProfileOverrides(rawUserId);
  const showUnverifiedBanner = Boolean(overrides.unverifiedByAdmin && !overrides.resubmitted);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = Boolean(
    nationality?.trim() &&
    dateOfBirth?.trim() &&
    nationalIdentity?.trim() &&
    phone?.trim() &&
    documentUrl?.trim()
  );

  useEffect(() => {
    if (initialNationality && !nationality) setNationality(initialNationality);
    if (initialDateOfBirth && !dateOfBirth) setDateOfBirth(initialDateOfBirth);
    if (initialNationalIdentity && !nationalIdentity) setNationalIdentity(initialNationalIdentity);
    if (initialCountryCode && !countryCode) setCountryCode(initialCountryCode);
    if (initialPhone && !phone) setPhone(initialPhone);
    if (initialSecondaryEmail && !secondaryEmail) setSecondaryEmail(initialSecondaryEmail);
    if (initialCurrency && !currency) setCurrency(initialCurrency);
  }, [
    initialNationality,
    initialDateOfBirth,
    initialNationalIdentity,
    initialCountryCode,
    initialPhone,
    initialSecondaryEmail,
    initialCurrency,
  ]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nationality || !nationality.trim()) {
      toast.error("Please select your Nationality.");
      return;
    }
    if (!dateOfBirth || !dateOfBirth.trim()) {
      toast.error("Please enter your Date of Birth.");
      return;
    }
    if (!nationalIdentity || !nationalIdentity.trim()) {
      toast.error("Please enter your National Identity number.");
      return;
    }
    if (!phone || !phone.trim()) {
      toast.error("Please enter your Phone Number.");
      return;
    }

    if (!documentUrl || !documentUrl.trim()) {
      toast.error("Please upload your ID Card or Passport document.");
      return;
    }

    setIsSubmitting(true);

    try {
      const patchData = {
        fullName,
        accountLabel: fullName,
        email,
        secondaryEmail,
        phone,
        countryCode,
        nationality,
        dateOfBirth,
        nationalIdentity,
        currency,
        documentUrl,
        resubmitted: true,
      };

      // 1. Save locally & persist profile overrides for immediate UI reflection
      updateProfile(patchData);

      // 2. Mark profile as complete in local storage & session
      markProfileComplete(rawUserId, accountType, patchData);

      // 3. Post to backend DB endpoint if authenticated
      const dbAccountType = user?.accountType || (accountType === "affiliate" ? "AGENCY" : accountType.toUpperCase());
      await completeUserProfile({
        accountType: dbAccountType,
        fullName,
        nationality,
        dateOfBirth,
        governmentId: nationalIdentity,
        idDocument: documentUrl,
        phone: `${countryCode}${phone}`,
        email,
        currency,
      }).catch(() => undefined);

      // 4. Refresh global user context
      if (refreshUser) {
        await refreshUser().catch(() => undefined);
      }

      toast.success("Profile Updated");

      // Stay on the profile page
      setTimeout(() => {
        setIsSubmitting(false);
      }, 300);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleUpdate} className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Unverified Banner - ONLY shown when admin explicitly unverified */}
        {showUnverifiedBanner && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-xs sm:text-sm font-medium leading-relaxed">
              <span className="font-bold block text-sm">Account Status: Pending Verification</span>
              Data and Document is not verified by admin. Please re-check and re-upload your document if needed.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
          {/* 1. Full Name (Read-only) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Full Name</span>
              <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(Non-editable)</span>
            </label>
            <input
              type="text"
              value={fullName}
              readOnly
              disabled
              className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground cursor-not-allowed opacity-90 truncate"
            />
          </div>

          {/* 2. Nationality (Mandatory A-Z Dropdown using Nationalities) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Nationality</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative w-full">
              <select
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                required
                className="w-full max-w-full truncate appearance-none rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 pr-8 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
              >
                <option value="" disabled>
                  Select nationality...
                </option>
                {ALL_NATIONALITIES.map((nat: string) => (
                  <option key={nat} value={nat} className="bg-card text-foreground">
                    {nat}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* 3. Date of Birth (Mandatory Date Picker) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Date of Birth</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
            />
          </div>

          {/* 4. National Identity (Mandatory Input) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>National Identity</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              placeholder="Govt ID / CNIC / SSN / Passport"
              value={nationalIdentity}
              onChange={(e) => setNationalIdentity(e.target.value)}
              required
              className="w-full rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground truncate"
            />
          </div>

          {/* 5. Phone Number with Dial Code Dropdown (Mandatory) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Phone Number</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="flex gap-2 w-full">
              {/* Dial Code Selector */}
              <div className="relative w-24 sm:w-28 shrink-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-input bg-background px-2 py-2 sm:px-2.5 sm:py-2.5 pr-6 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground truncate"
                >
                  {ALL_COUNTRIES.map((c) => (
                    <option key={`${c.code}-${c.dialCode}`} value={c.dialCode} className="bg-card text-foreground">
                      {c.code} ({c.dialCode})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
              </div>

              {/* Phone Input */}
              <input
                type="tel"
                placeholder="e.g. 3001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
              />
            </div>
          </div>

          {/* 6. Secondary Email (Optional) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Secondary Email</span>
              <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(Optional)</span>
            </label>
            <input
              type="email"
              placeholder="secondary@example.com"
              value={secondaryEmail}
              onChange={(e) => setSecondaryEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground truncate"
            />
          </div>

          {/* 7. Email Address (Read-only from DB) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(Registered DB Email)</span>
            </label>
            <input
              type="email"
              value={email}
              readOnly
              disabled
              className="w-full rounded-lg border border-border bg-muted/60 px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-foreground cursor-not-allowed opacity-90 truncate"
            />
          </div>

          {/* 8. Preferred Currency (Theme Dropdown) */}
          <div className="flex flex-col gap-2 min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Preferred Currency
            </label>
            <div className="relative w-full">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full max-w-full truncate appearance-none rounded-lg border border-input bg-background px-3 py-2 sm:px-3.5 sm:py-2.5 pr-8 text-xs sm:text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
              >
                {CURRENCY_LIST.map((cur) => (
                  <option key={cur.code} value={cur.code} className="bg-card text-foreground">
                    {cur.code} ({cur.symbol}) — {cur.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* 9. Mandatory Document Upload Row */}
          <div className="flex flex-col gap-2 min-w-0 md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <span>Identity Document / Passport</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-input bg-card shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  onClick={() => documentUrl && setPreviewModalOpen(true)}
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl overflow-hidden transition-all ${
                    documentUrl 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-pointer hover:scale-105 border border-emerald-500/20" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {documentUrl ? (
                    <img src={documentUrl} alt="Thumbnail" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2 truncate">
                    {documentUrl ? (
                      <>
                        <span className="cursor-pointer hover:underline" onClick={() => setPreviewModalOpen(true)}>
                          ID Card / Passport Attached
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                          Uploaded
                        </span>
                      </>
                    ) : (
                      "No Document Uploaded"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {documentUrl ? "Click thumbnail or name to view full preview image" : "Upload your ID Card or Passport (PNG, JPG, JPEG)"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                {documentUrl && (
                  <button
                    type="button"
                    onClick={() => setPreviewModalOpen(true)}
                    className="inline-flex flex-1 md:flex-none items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all"
                    title="View Document Preview"
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>View</span>
                  </button>
                )}
                {documentUrl && (
                  <button
                    type="button"
                    onClick={() => setDocumentUrl("")}
                    className="inline-flex flex-1 md:flex-none items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
                    title="Remove Document Selection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex flex-1 md:flex-none items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all whitespace-nowrap"
                >
                  <Upload className="h-3.5 w-3.5 shrink-0" />
                  <span>{documentUrl ? "Change Document" : "Upload Document"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Update Button Section */}
        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          {!isFormValid && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              * Please fill all mandatory fields and upload your ID document to enable Update Profile.
            </p>
          )}
          <div className="w-full sm:w-auto flex justify-end">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full sm:w-auto rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Updating Profile...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Document Upload Modal */}
      <UploadDocumentModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        existingUrl={documentUrl}
        onUploadSuccess={(url) => setDocumentUrl(url)}
      />

      {/* Full Image Preview Popup Modal */}
      {previewModalOpen && documentUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-card rounded-2xl overflow-hidden border border-border shadow-2xl p-5 flex flex-col items-center">
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Identity Document / Passport Preview
            </h4>
            <img
              src={documentUrl}
              alt="Document Full View"
              className="max-h-[75vh] w-full object-contain rounded-xl border border-border bg-black/5"
            />
          </div>
        </div>
      )}
    </>
  );
}
