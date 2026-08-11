"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Download,
  Headset,
  KeyRound,
  Monitor,
  Shield,
  Smartphone,
  Trash2,
  AlertTriangle,
  Loader2,
  Eye,
  Upload,
  X,
  Mail,
  Phone
} from "lucide-react"
import { toast } from "sonner"
import { useUser } from "@/src/context/user.provider"
import { useIsDemoAccount } from "@/src/shared/hooks/use-is-demo-account"
import KycApplicationModal from "../../shared/components/profile/KycApplicationModal"
import { useProfileDisplay, getStatusBadgeStyle } from "../../shared/hooks/use-profile-display"
import { getProfileOverrides } from "@/src/shared/utils/profile-storage"
import SelectDropdown from "@/src/shared/components/SelectDropdown"
import { ALL_COUNTRIES, ALL_NATIONALITIES } from "@/src/shared/constants/countries"
import { recordRealActivity, getLogsForUser, LOG_ADDED_EVENT } from "@/src/shared/lib/real-activity-logger"

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100:border-indigo-500"
const labelClass = "mb-1.5 block text-xs font-semibold text-gray-600"
const cardClass = "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6"
const outlineBtn =
  "inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
const primaryBtn =
  "inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"


const ID_FILES = [
  { name: "ID Front Side", file: "nid_front.jpg", date: "Uploaded May 12, 2023" },
  { name: "ID Back Side", file: "nid_back.jpg", date: "Uploaded May 12, 2023" },
]

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      <BadgeCheck className="h-3 w-3" />
      Verified
    </span>
  )
}

function UnaddedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
      Not added yet
    </span>
  )
}

export default function ProfilePageLayout() {
  const { user, refreshUser } = useUser()
  const { isDemo } = useIsDemoAccount()
  const {
    rawUserId, displayUserId, isActive, status, isKycVerified, kycStatus,
    documentUrl, documentFrontUrl, documentBackUrl, documentFrontName, documentBackName, nationality: hookNationality, nationalIdentity,
    avatarUrl, updateProfile, dateOfBirth, kycApplicationData,
    fullName, email: profileEmail, phone: profilePhone, initials,
    username: hookUsername, gender: hookGender, bio: hookBio, currency: hookCurrency,
    permanentAddress, governmentIdType, joiningDate,
    hasCustomAvatar
  } = useProfileDisplay()

  const [isKycModalOpen, setIsKycModalOpen] = useState(false)

  const avatarFileRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

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
        await refreshUser().catch(() => { });
      }
      setIsUploadingAvatar(false);
      toast.success("Profile Photo Uploaded");
    } catch (error: any) {
      setIsUploadingAvatar(false);
      toast.error(error?.message || "Failed to save profile picture.");
    }
    e.target.value = "";
  };

  const [username, setUsername] = useState(hookUsername || (isDemo ? "johndoe_business" : ""))
  const [gender, setGender] = useState(hookGender || "Select")
  const [nationality, setNationality] = useState(hookNationality || "")
  const [dob, setDob] = useState(dateOfBirth || (isDemo ? "1990-05-15" : ""))
  const [bio, setBio] = useState(
    hookBio || (isDemo ? "Business partner and digital entrepreneur." : "")
  )
  const [telegram, setTelegram] = useState(isDemo ? "@johndoe" : "")
  const [whatsapp, setWhatsapp] = useState(isDemo ? "+880 1234-567890" : "")
  const [country, setCountry] = useState(permanentAddress?.country || (isDemo ? "Bangladesh" : ""))
  const [state, setState] = useState(permanentAddress?.state || (isDemo ? "Dhaka" : ""))
  const [city, setCity] = useState(permanentAddress?.city || (isDemo ? "Dhaka" : ""))
  const [zip, setZip] = useState(permanentAddress?.zipCode || (isDemo ? "1205" : ""))
  const [address, setAddress] = useState(
    permanentAddress?.address || (isDemo ? "House-123, Road-5, Dhanmondi, Dhaka-1205, Bangladesh" : "")
  )
  const [language, setLanguage] = useState("English")
  const [currency, setCurrency] = useState(hookCurrency || "USD - US Dollar")
  const [timezone, setTimezone] = useState("(UTC+06:00) Dhaka, Bangladesh")
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false)
  const [isUpdatingVerification, setIsUpdatingVerification] = useState(false)
  const [usernameError, setUsernameError] = useState("")

  const [idType, setIdType] = useState(governmentIdType || "National ID Card")
  const [idNumber, setIdNumber] = useState(nationalIdentity || "")
  const [frontDoc, setFrontDoc] = useState(documentFrontUrl || "")
  const [backDoc, setBackDoc] = useState(documentBackUrl || "")
  const [frontDocName, setFrontDocName] = useState(documentFrontName || "")
  const [backDocName, setBackDocName] = useState(documentBackName || "")
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string, title: string } | null>(null)
  const frontFileRef = useRef<HTMLInputElement>(null)
  const backFileRef = useRef<HTMLInputElement>(null)

  const handleIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^[0-9]+$/.test(val)) {
      setIdNumber(val);
    }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error("Please select a JPG, JPEG, or PNG image file.");
      return;
    }

    try {
      const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
      const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.7);
      if (side === "front") {
        setFrontDoc(compressedBase64);
        setFrontDocName(file.name);
      } else {
        setBackDoc(compressedBase64);
        setBackDocName(file.name);
      }
    } catch (err: any) {
      toast.error("Failed to process image.");
    }
    e.target.value = "";
  }

  const handleDeleteDoc = async (side: "front" | "back") => {
    const dbValue = side === "front" ? documentFrontUrl : documentBackUrl;
    const localValue = side === "front" ? frontDoc : backDoc;

    if (localValue && localValue !== dbValue) {
      if (side === "front") setFrontDoc(dbValue || "");
      else setBackDoc(dbValue || "");
      return;
    }

    setIsUpdatingVerification(true);
    try {
      let updatedFront = side === "front" ? "" : frontDoc;
      let updatedBack = side === "back" ? "" : backDoc;

      let newDocumentUrl = "";
      if (updatedFront || updatedBack) {
        newDocumentUrl = JSON.stringify([
          { url: updatedFront, name: side === "front" ? "" : frontDocName },
          { url: updatedBack, name: side === "back" ? "" : backDocName }
        ]);
      }

      await updateProfile({ documentUrl: newDocumentUrl });
      recordRealActivity("DOCUMENT_DELETED", `Business deleted ${side === 'front' ? 'FRONT_ID' : 'BACK_ID'} document`, { userId: rawUserId, email: profileEmail, name: fullName });
      toast.success("Document deleted");
      if (side === "front") {
        setFrontDoc("");
        setFrontDocName("");
      } else {
        setBackDoc("");
        setBackDocName("");
      }
    } catch (err: any) {
      toast.error("Failed to delete document.");
    } finally {
      setIsUpdatingVerification(false);
    }
  }

  const handleUpdateVerification = async () => {
    if (!idType) {
      toast.error("Please select an ID Type.");
      return;
    }
    if (!idNumber) {
      toast.error("Please provide your ID Number.");
      return;
    }

    const currentDocStr = JSON.stringify([
      { url: frontDoc || "", name: frontDocName || "" },
      { url: backDoc || "", name: backDocName || "" }
    ]);
    const dbDocStr = JSON.stringify([
      { url: documentFrontUrl || "", name: documentFrontName || "" },
      { url: documentBackUrl || "", name: documentBackName || "" }
    ]);

    if (
      idType === (governmentIdType || "") &&
      idNumber === (nationalIdentity || "") &&
      currentDocStr === dbDocStr
    ) {
      toast.success("Already Updated");
      return;
    }

    setIsUpdatingVerification(true);
    try {
      const newDocumentUrl = currentDocStr;

      await updateProfile({
        governmentIdType: idType,
        nationalIdentity: idNumber,
        documentUrl: newDocumentUrl
      });

      if (currentDocStr !== dbDocStr) {
        if (frontDoc && frontDoc !== documentFrontUrl) {
          recordRealActivity("DOCUMENT_UPLOADED", "Business uploaded FRONT_ID document", { userId: rawUserId, email: profileEmail, name: fullName });
        }
        if (backDoc && backDoc !== documentBackUrl) {
          recordRealActivity("DOCUMENT_UPLOADED", "Business uploaded BACK_ID document", { userId: rawUserId, email: profileEmail, name: fullName });
        }
      }

      recordRealActivity("VERIFICATION_UPDATED", "Business updated Identity Verification", { userId: rawUserId, email: profileEmail, name: fullName });
      toast.success("Verification updated successfully");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update verification.");
    } finally {
      setIsUpdatingVerification(false);
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    if (!val) {
      setUsernameError("");
      return;
    }
    const isValid = /^[a-z](?:[a-z0-9._]*[a-z0-9])?$/.test(val);
    if (!isValid) {
      setUsernameError("not valid");
    } else {
      setUsernameError("");
    }
  };

  const handleUpdateProfile = async () => {
    if (gender === "Select" || !gender) {
      toast.error("Please select a gender.");
      return;
    }
    if (!dob) {
      toast.error("Please provide your date of birth.");
      return;
    }
    if (username && usernameError && usernameError !== "username already taken, choose another") {
      toast.error("Please provide a valid username.");
      return;
    }

    if (
      username === (hookUsername || "") &&
      gender === (hookGender || "Select") &&
      nationality === (hookNationality || "") &&
      dob === (dateOfBirth || "") &&
      bio === (hookBio || "") &&
      currency === (hookCurrency || "USD - US Dollar")
    ) {
      toast.success("Already Updated");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const patch: any = {};
      if (username !== (hookUsername || "")) patch.username = username;
      if (gender !== (hookGender || "Select")) patch.gender = gender;
      if (nationality !== (hookNationality || "")) patch.nationality = nationality;
      if (dob !== (dateOfBirth || "")) patch.dateOfBirth = dob;
      if (bio !== (hookBio || "")) patch.bio = bio;
      if (currency !== (hookCurrency || "USD - US Dollar")) patch.currency = currency;

      await updateProfile(patch);
      toast.success("Personal Information Updated Successfully");
      setUsernameError("");
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes("username")) {
        setUsernameError("username already taken, choose another");
      } else {
        toast.error(e?.message || "Failed to update profile.");
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  const handleUpdateAddress = async () => {
    if (!country) {
      toast.error("Please select a Country.");
      return;
    }
    if (!state) {
      toast.error("Please provide your State/Division.");
      return;
    }
    if (!city) {
      toast.error("Please provide your City.");
      return;
    }
    if (!address) {
      toast.error("Please provide your Full Address.");
      return;
    }

    if (
      country === (permanentAddress?.country || "") &&
      state === (permanentAddress?.state || "") &&
      city === (permanentAddress?.city || "") &&
      zip === (permanentAddress?.zipCode || "") &&
      address === (permanentAddress?.address || "")
    ) {
      toast.success("Already Updated");
      return;
    }

    setIsUpdatingAddress(true);
    try {
      await updateProfile({
        permanentAddress: {
          country,
          state,
          city,
          zipCode: zip,
          address
        }
      });
      toast.success("Address Updated Successfully");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update address.");
    } finally {
      setIsUpdatingAddress(false);
    }
  }

  const save = (label: string) => {
    if (label === "Profile") {
      handleUpdateProfile();
      return;
    }
    if (label === "Address") {
      handleUpdateAddress();
      return;
    }
    toast.success(`${label} saved`)
  }

  const handleApplyKycClick = () => {
    if (kycStatus === "pending" || kycStatus === "submitted" || isKycVerified) {
      setIsKycModalOpen(true);
      return;
    }

    const missingFields: string[] = [];
    if (!fullName) missingFields.push("Full Name");
    if (!profilePhone && !profileEmail) missingFields.push("Phone or Email");
    if (!dob) missingFields.push("Date of Birth");
    if (!nationality) missingFields.push("Nationality");
    if (!nationalIdentity) missingFields.push("ID Number");
    if (!documentFrontUrl) missingFields.push("Front ID Document");
    if (idType !== "Passport" && !documentBackUrl) missingFields.push("Back ID Document");
    if (!hasCustomAvatar) missingFields.push("Profile Photo");

    if (missingFields.length > 0) {
      toast.error(`Please complete the following missing fields before applying for KYC: ${missingFields.join(', ')}`);
      return;
    }

    setIsKycModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Top Row: Pill and Action Buttons (Pulled up to align with tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 sm:-mt-[70px] mb-6 relative z-10 pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pointer-events-none w-full sm:w-auto">
          {isKycVerified ? (
            <span className="flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-600 shrink-0">
              <BadgeCheck className="h-4 w-4" />
              Verified Account
            </span>
          ) : (
            <span className="flex items-center justify-center sm:justify-start w-full sm:w-auto gap-2 rounded-lg bg-slate-500/10 border border-slate-500/20 px-4 py-2 text-sm font-medium text-slate-600 shrink-0">
              Unverified Account
            </span>
          )}

          <button
            type="button"
            onClick={handleApplyKycClick}
            className="pointer-events-auto w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-all shrink-0"
          >
            {isKycVerified || kycStatus === "pending" || kycStatus === "submitted" ? "View Application" : kycStatus === "rejected" ? "Re Apply KYC" : "Apply KYC"}
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="contents xl:block xl:min-w-0 xl:space-y-5">
          {kycStatus === 'rejected' && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 mb-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-red-700">Account Unverified by Admin</h4>
                  <p className="mt-1 text-sm text-red-600/90">
                    Your KYC application was rejected. Please review your personal information and re-upload a clear document if needed, then re-apply for KYC.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Profile preview */}
          <section id="preview" className="rounded-2xl border border-gray-100 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col w-full order-1 xl:order-none">
            <div className="p-6 flex flex-col md:flex-row gap-8 items-center w-full">
            {/* Left: Avatar */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative h-28 w-28 rounded-full border-[3px] border-slate-50 shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center text-3xl font-bold text-white bg-indigo-500">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
                <button 
                  onClick={() => avatarFileRef.current?.click()}
                  className="absolute bottom-1 right-1 rounded-full bg-blue-600 p-1.5 text-white shadow-md border-2 border-white hover:bg-blue-700 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-col items-center">
                <button onClick={() => avatarFileRef.current?.click()} className="text-[13px] font-semibold text-blue-600 hover:underline">Change Photo</button>
                <button 
                  onClick={async () => {
                    if (avatarUrl) {
                      await updateProfile({ avatarUrl: "" });
                      if (refreshUser) refreshUser();
                      toast.success("Profile photo removed");
                    }
                  }} 
                  className="text-xs font-medium text-red-500 hover:underline mt-0.5"
                >
                  Remove
                </button>
              </div>
            </div>
            
            {/* Middle: Info */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">{fullName}</h2>
                {isKycVerified && <BadgeCheck className="w-6 h-6 text-blue-600 fill-blue-600 text-white" />}
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 dark:text-slate-400 mb-6 font-medium">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400"/> {profileEmail || "No Email"}</div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> {profilePhone || "No Phone"}</div>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-10 gap-y-4 text-sm mt-2">
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Business ID</span>
                  <span className="font-bold text-slate-900 dark:text-white">{displayUserId}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Joined</span>
                  <span className="font-bold text-slate-900 dark:text-white">{joiningDate || "—"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Location</span>
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {permanentAddress?.country || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Account Type</span>
                  <span className="font-bold text-slate-900 dark:text-white">Business</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Status</span>
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${status === 'active' || status === 'verified' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <span className="capitalize">{status || "active"}</span>
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right: Circular Progress */}
            <div className="flex flex-col shrink-0 md:w-64 md:pl-8 md:border-l border-slate-100 dark:border-slate-800 self-stretch justify-center mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1.5">Profile Completeness</h3>
              <p className="text-[11.5px] text-slate-500 leading-relaxed mb-5 pr-4">Complete your profile to unlock all features and get the experience</p>
              
              {/* SVG Circular Progress */}
              <div className="relative w-28 h-28 self-start md:ml-4">
                <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {(() => {
                    const reqFields = [!!fullName, !!(profileEmail || profilePhone), !!dateOfBirth, !!nationality, !!nationalIdentity, !!documentFrontUrl, !!hasCustomAvatar];
                    if (idType !== "Passport") reqFields.push(!!documentBackUrl);
                    const filled = reqFields.filter(Boolean).length;
                    const pct = Math.round((filled / reqFields.length) * 100);
                    return (
                      <>
                        <path
                          className="text-[#1355D4]"
                          strokeWidth="3.5"
                          strokeDasharray={`${pct}, 100`}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-0.5">
                          <span className="text-xl font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">{pct}%</span>
                          <span className="text-[9.5px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Complete</span>
                        </div>
                      </>
                    )
                  })()}
                </svg>
              </div>
              </div>
            </div>
            
            {/* Bottom: Level Progress */}
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Level Progress</h3>
                <span className="text-[13px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">{isDemo ? "5 of 6 levels completed" : "0 of 6 levels completed"}</span>
              </div>
              
              <div className="relative pb-5 px-1 mt-2">
                {/* Background Track */}
                <div className="absolute top-[9px] left-0 w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                {/* Progress Fill */}
                <div className={`absolute top-[9px] left-0 h-2 bg-[#1355D4] rounded-full transition-all duration-500 ${isDemo ? 'w-[80%]' : 'w-[0%]'}`}></div>
                
                {/* Nodes */}
                <div className="relative flex justify-between z-10">
                  {["Intake", "Bronze", "Silver", "Gold", "Platinum", "Diamond"].map((level, idx) => {
                    // Logic for Demo (mocked 5 levels done, current level Diamond)
                    const isCompleted = isDemo ? idx <= 4 : false;
                    const isCurrent = isDemo ? idx === 5 : idx === 0;
                    
                    return (
                      <div key={level} className="flex flex-col items-center group cursor-default">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 shadow-sm transition-colors ${
                          isCompleted 
                            ? 'bg-[#1355D4] border-[#1355D4]' 
                            : isCurrent 
                              ? 'bg-white dark:bg-slate-900 border-[#1355D4]' 
                              : 'bg-slate-200 dark:bg-slate-700 border-slate-200 dark:border-slate-700'
                        }`}>
                          {isCompleted && <BadgeCheck className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`absolute top-6 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${
                          isCompleted ? 'text-slate-800 dark:text-slate-200' : 
                          isCurrent ? 'text-[#1355D4]' : 
                          'text-slate-400 dark:text-slate-500'
                        }`}>
                          {level}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Main Profile Columns */}
          <div className="order-4 xl:order-none w-full grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
            {/* Left Column: Personal + Identity */}
            <div className="flex flex-col gap-5">
              <section id="personal" className={cardClass}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Personal Information</h2>
                <div className="mb-5 flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="relative flex h-20 w-20 overflow-hidden items-center justify-center rounded-full bg-indigo-500 text-xl font-bold text-white shadow">
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                      ) : (
                        initials
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      className="absolute -right-0.5 -bottom-0.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow ring-2 ring-white transition-transform hover:scale-110"
                      aria-label="Change photo"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">JPG, JPEG or PNG. Max size 2MB.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Full Name <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input className={inputClass} value={fullName} readOnly />
                  </div>
                  <div className="sm:col-span-2 flex flex-col">
                    <label className={labelClass}>Username</label>
                    <input
                      className={`${inputClass} ${usernameError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                      value={username}
                      onChange={handleUsernameChange}
                    />
                    {usernameError && (
                      <div className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 border border-red-200">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="capitalize">{usernameError}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>
                      Gender <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="Select" disabled>Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Date of Birth <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input type="date" className={inputClass} value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelClass}>
                      Nationality <span className="text-red-500 font-bold">*</span>
                    </label>
                    <SelectDropdown
                      value={nationality}
                      onChange={setNationality}
                      placeholder="Select nationality..."
                      required
                      options={ALL_NATIONALITIES.map((nat: string) => ({ label: nat, value: nat }))}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className={labelClass}>Currency</label>
                    <select className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option>USD - US Dollar</option>
                      <option>EUR - Euro</option>
                      <option>BDT - Bangladeshi Taka</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Bio (Optional)</label>
                    <textarea
                      className={`${inputClass} min-h-[140px] resize-y`}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={40}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className={`${primaryBtn} flex items-center justify-center gap-2`}
                    onClick={() => save("Profile")}
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                    Update Profile
                  </button>
                </div>
              </section>
            </div>

            {/* Right Column: Contact + Address */}
            <div className="flex flex-col gap-5">
              <section id="contact" className={cardClass}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Contact Information</h2>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <div className="relative">
                      <input className={`${inputClass} pr-24`} value={profileEmail || ""} readOnly />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        {profileEmail ? <VerifiedBadge /> : <UnaddedBadge />}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <div className="relative">
                      <input
                        className={`${inputClass} pr-24`}
                        value={profilePhone || ""}
                        readOnly
                      />
                      <span className="absolute top-1/2 right-3 -translate-y-1/2">
                        {profilePhone ? <VerifiedBadge /> : <UnaddedBadge />}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" className={outlineBtn} onClick={() => save("Contact info")}>
                    Update Contact Info
                  </button>
                </div>
              </section>
              <section id="address" className={cardClass}>
                <h2 className="mb-4 text-base font-bold text-gray-900">Address</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Country <span className="text-red-500 font-bold">*</span>
                    </label>
                    <SelectDropdown
                      value={country}
                      onChange={setCountry}
                      placeholder="Select Country..."
                      options={ALL_COUNTRIES.map((c) => ({ label: c.name, value: c.name }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      State / Division <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>
                      City <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP / Postal Code</label>
                    <input className={inputClass} value={zip} onChange={(e) => setZip(e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Full Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <textarea
                      className={`${inputClass} min-h-[88px] resize-y`}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    className={`${outlineBtn} flex items-center justify-center gap-2`}
                    onClick={() => save("Address")}
                    disabled={isUpdatingAddress}
                  >
                    {isUpdatingAddress && <Loader2 className="h-4 w-4 animate-spin" />}
                    Update Address
                  </button>
                </div>
              </section>
            </div>
          </div>

          {/* Identity Verification */}
          <div className="grid grid-cols-1 gap-5 order-5 xl:order-none w-full">
            <section id="identity" className={`${cardClass} flex flex-col`}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-gray-900">Identity Verification</h2>
                {isKycVerified ? <VerifiedBadge /> : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    <Shield className="h-3.5 w-3.5" /> Unverified
                  </span>
                )}
              </div>
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    ID Type <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select className={inputClass} value={idType} onChange={(e) => setIdType(e.target.value)}>
                    <option value="National ID Card">National ID Card</option>
                    <option value="Driving Licence">Driving Licence</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    ID Number <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input className={inputClass} value={idNumber} onChange={handleIdNumberChange} />
                </div>
              </div>

              <input type="file" ref={frontFileRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => handleDocUpload(e, "front")} />
              <input type="file" ref={backFileRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={(e) => handleDocUpload(e, "back")} />
              <input type="file" ref={avatarFileRef} className="hidden" accept=".jpg,.jpeg,.png" onChange={handleAvatarChange} />

              <ul className="space-y-2.5">
                {[
                  { name: "ID Front Side", ref: frontFileRef, side: "front" as const, doc: frontDoc, dbUrl: documentFrontUrl, fileName: frontDocName },
                  { name: "ID Back Side", ref: backFileRef, side: "back" as const, doc: backDoc, dbUrl: documentBackUrl, fileName: backDocName },
                ].map((f) => (
                  <li
                    key={f.name}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-slate-50/80 px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      f.ref.current?.click();
                    }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600 overflow-hidden">
                      {f.doc ? (
                        <img src={f.doc} alt={f.name} className="h-full w-full object-cover" />
                      ) : (
                        "ID"
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{f.name}</p>
                      <p className="truncate text-[11px] text-gray-400">
                        {f.doc ? (f.doc === f.dbUrl ? `${f.fileName ? f.fileName + " " : ""}Uploaded ${joiningDate || "on file"}` : `${f.fileName ? f.fileName + " " : ""}Ready to Update`) : "Click to select a JPG/PNG file"}
                      </p>
                    </div>
                    {f.doc && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          onClick={() => {
                            setPreviewDoc({ url: f.doc, name: f.fileName, title: f.name });
                            setPreviewModalOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          onClick={() => handleDeleteDoc(f.side)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!f.doc && <Upload className="h-4 w-4 shrink-0 text-gray-400" />}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4 flex justify-end">
                <button
                  type="button"
                  className={`${outlineBtn} flex items-center justify-center gap-2`}
                  onClick={handleUpdateVerification}
                  disabled={isUpdatingVerification}
                >
                  {isUpdatingVerification && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update Verification
                </button>
              </div>
            </section>
          </div>

        </div>

        {/* Right rail */}
        <aside className="contents xl:block xl:space-y-5">
          <div className={`${cardClass} xl:h-[318px] flex flex-col order-2 xl:order-none w-full`}>
            <h2 className="mb-4 text-base font-bold text-gray-900">Account Overview</h2>
            <dl className="space-y-3 text-sm">
              {[
                {
                  label: "Member Since",
                  value: user && "createdAt" in user && user.createdAt
                    ? new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                    : "—"
                },
                { label: "Account Type", value: "Business" },
                { label: "Status", value: status, badge: true },
                {
                  label: "ID",
                  value: displayUserId
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <dt className="text-gray-500">{row.label}</dt>
                  <dd>
                    {row.badge ? (
                      <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${getStatusBadgeStyle(status).pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusBadgeStyle(status).dot} ${status === 'pending' ? 'animate-pulse' : ''}`} />
                        {getStatusBadgeStyle(status).label}
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-900">{row.value}</span>
                    )}
                  </dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Email</dt>
                <dd>
                  {profileEmail ? (
                    <VerifiedBadge />
                  ) : (
                    <UnaddedBadge />
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-gray-500">Phone</dt>
                <dd>
                  {profilePhone ? (
                    <VerifiedBadge />
                  ) : (
                    <UnaddedBadge />
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className={`${cardClass} flex flex-col justify-center order-3 xl:order-none w-full`}>
            <h2 className="mb-3 text-base font-bold text-gray-900">Quick Links</h2>
            <ul className="space-y-1">
              {[
                { label: "Change Password", href: "/business/settings/change-password", icon: KeyRound },
                { label: "Two-Factor Authentication", href: "/business/settings/account-security", icon: Shield },
                { label: "Download My Data", href: "/business/messages", icon: Download },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm order-6 xl:order-none w-full">
            <h2 className="text-base font-bold text-gray-900">Need Help?</h2>
            <p className="mt-1 text-sm text-gray-500">
              If you need help with your account, contact our support team.
            </p>
            <Link href="/business/messages" className={`${primaryBtn} mt-4 w-full gap-2`}>
              <Headset className="h-4 w-4" />
              Contact Support
            </Link>
          </div>
        </aside>
      </div>

      <KycApplicationModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        user={{
          ...user,
          fullName, email: profileEmail, phone: profilePhone,
          nationality, nationalIdentity: idNumber, governmentIdType: idType, dateOfBirth,
          permanentAddress: { country, city, state, zipCode: zip, address },
          avatarUrl, profilePhoto: avatarUrl,
          documentUrl, 
          documentFrontUrl, 
          documentBackUrl,
          kycApplicationData,
          updateProfile
        }}
        kycStatus={kycStatus}
        isKycVerified={isKycVerified}
        onSuccess={() => setIsKycModalOpen(false)}
      />

      {previewModalOpen && previewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-fit min-w-[300px] max-w-3xl flex flex-col max-h-[90vh] rounded-2xl bg-white shadow-2xl">
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{previewDoc.title}</h3>
                {previewDoc.name && <p className="text-xs text-gray-500 mt-0.5">{previewDoc.name}</p>}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                onClick={() => setPreviewModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl overflow-auto flex justify-center">
              <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full h-auto object-contain rounded-lg shadow-sm border border-gray-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
