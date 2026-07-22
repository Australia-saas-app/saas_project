"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, User, ShieldCheck } from "lucide-react";
import { useUser } from "@/src/context/user.provider";
import { useProfileDisplay } from "../../hooks/use-profile-display";
import { ALL_COUNTRIES, CURRENCY_LIST } from "@/src/shared/constants/countries";
import { markProfileComplete, type ProfileAccountType } from "@/src/shared/lib/profile-completion";
import { accountTypeFromRole } from "@/src/shared/lib/verification-access";
import { completeUserProfile } from "@/src/shared/server/AuthService";

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

  const [isSubmitting, setIsSubmitting] = useState(false);

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
        phone: `${countryCode}${phone}`,
        email,
        currency,
      }).catch(() => undefined);

      // 4. Refresh global user context
      if (refreshUser) {
        await refreshUser().catch(() => undefined);
      }

      toast.success("Profile Updated");

      // 5. Redirect user to their respective dashboard & enable sidebar
      setTimeout(() => {
        const dest = `/${accountType}/dashboard`;
        router.push(dest);
        if (typeof window !== "undefined") {
          window.location.href = dest;
        }
      }, 500);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleUpdate} className="p-6 md:p-8 space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {/* 1. Full Name (Read-only) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Full Name</span>
            <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(Non-editable)</span>
          </label>
          <input
            type="text"
            value={fullName}
            readOnly
            disabled
            className="w-full rounded-lg border border-border bg-muted/60 px-3.5 py-2.5 text-sm font-medium text-foreground cursor-not-allowed opacity-90"
          />
        </div>

        {/* 2. Nationality (Mandatory A-Z Dropdown) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span>Nationality</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="relative">
            <select
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              required
              className="w-full appearance-none rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
            >
              <option value="" disabled>
                Select your country...
              </option>
              {ALL_COUNTRIES.map((c) => (
                <option key={c.code} value={c.name} className="bg-card text-foreground">
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* 3. Date of Birth (Mandatory Date Picker) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span>Date of Birth</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
          />
        </div>

        {/* 4. National Identity (Mandatory Input) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span>National Identity</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Govt ID / CNIC / SSN / Passport"
            value={nationalIdentity}
            onChange={(e) => setNationalIdentity(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
          />
        </div>

        {/* 5. Phone Number with Dial Code Dropdown (Mandatory) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span>Phone Number</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <div className="flex gap-2">
            {/* Dial Code Selector */}
            <div className="relative w-28 shrink-0">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-2.5 pr-7 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
              >
                {ALL_COUNTRIES.map((c) => (
                  <option key={`${c.code}-${c.dialCode}`} value={c.dialCode} className="bg-card text-foreground">
                    {c.code} ({c.dialCode})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            {/* Phone Input */}
            <input
              type="tel"
              placeholder="e.g. 3001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
            />
          </div>
        </div>

        {/* 6. Secondary Email (Optional) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Secondary Email</span>
            <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(Optional)</span>
          </label>
          <input
            type="email"
            placeholder="e.g. secondary@example.com"
            value={secondaryEmail}
            onChange={(e) => setSecondaryEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
          />
        </div>

        {/* 7. Email Address (Read-only from DB) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Email Address</span>
            <span className="text-[10px] text-muted-foreground/70 normal-case font-normal">(Registered DB Email)</span>
          </label>
          <input
            type="email"
            value={email}
            readOnly
            disabled
            className="w-full rounded-lg border border-border bg-muted/60 px-3.5 py-2.5 text-sm font-medium text-foreground cursor-not-allowed opacity-90"
          />
        </div>

        {/* 8. Preferred Currency (Theme Dropdown) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Preferred Currency
          </label>
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full appearance-none rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-card dark:text-foreground"
            >
              {CURRENCY_LIST.map((cur) => (
                <option key={cur.code} value={cur.code} className="bg-card text-foreground">
                  {cur.code} ({cur.symbol}) — {cur.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Bottom Update Button Section */}
      <div className="pt-4 border-t border-border flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center gap-2"
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
    </form>
  );
}
