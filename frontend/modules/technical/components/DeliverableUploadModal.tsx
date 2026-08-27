"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Upload,
  FileArchive,
  FileText,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronRight,
  Download,
  CheckCheck,
  Clock,
  RotateCcw,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { markProjectComplete, readLocalProjects } from "../services/technical.services";

// Convert File to base64 Data URL — exactly matches CreateProjectLayout.tsx
const toBase64 = (file: File): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

export interface DeliverableFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

interface Props {
  project: {
    projectId: string;
    title: string;
    submissionStatus?: string;
    paymentTerms?: string;
    milestones?: any[];
    deliverableUrls?: string[];
    deliverableFiles?: DeliverableFile[];
    completionNotes?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_TOTAL_SIZE_MB = 10;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".zip", ".txt"];
const MAX_NOTE_CHARS = 150;

function getMilestoneCount(paymentTerms?: string): number {
  if (!paymentTerms) return 1;
  const t = paymentTerms.toLowerCase();
  if (t.includes("three")) return 3;
  if (t.includes("two")) return 2;
  return 1;
}

function getMilestoneLabel(index: number, _total: number): string {
  return `Milestone ${index + 1}`;
}

interface MilestoneData {
  existingFiles: DeliverableFile[];
  newFiles: File[];
  links: string[];
  note: string;
  status: "pending" | "submitted" | "accepted" | "revision";
  clientNote?: string;
  submitted: boolean; // locally ready or already in DB
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if ([".zip"].includes(ext)) return <FileArchive className="h-5 w-5 text-amber-500" />;
  return <FileText className="h-5 w-5 text-blue-500" />;
};

// Create a temporary object-URL for downloading a local File object
function downloadLocalFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function DeliverableUploadModal({ project, onClose, onSuccess }: Props) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileStep, setCurrentFileStep] = useState("");
  const [newLink, setNewLink] = useState("");
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [sizeLimitModal, setSizeLimitModal] = useState(false);
  const [sizeLimitInfo, setSizeLimitInfo] = useState({ current: 0, max: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const milestoneCount = getMilestoneCount(project.paymentTerms);
  const dbMilestones: any[] = Array.isArray(project.milestones) ? project.milestones : [];
  const isOverallCompleted = project.submissionStatus === "completed" || isCompleted;
  const isOverallAccepted = project.submissionStatus === "accepted";
  const isOverallRevision = project.submissionStatus === "revision" && !isCompleted;

  // Parse notes per milestone if formatted as [Milestone 1] note...
  const parseNotesForMilestone = (idx: number): string => {
    // 1. Check if specific milestone has note in dbMilestones array
    const msDb = dbMilestones[idx];
    if (msDb && (msDb.note || msDb.completionNotes || msDb.deliveryNote || msDb.notes)) {
      return String(msDb.note || msDb.completionNotes || msDb.deliveryNote || msDb.notes).trim();
    }

    // 2. Read completionNotes from project prop or local storage fallback
    const localProject = typeof window !== "undefined"
      ? readLocalProjects().find((lp: any) => lp.projectId === project.projectId || String(lp.id) === String(project.projectId))
      : null;

    const raw = (
      project.completionNotes ||
      (project as any).notes ||
      (project as any).deliveryNotes ||
      localProject?.completionNotes ||
      localProject?.notes ||
      ""
    ).trim();

    if (!raw) return "";

    const label = getMilestoneLabel(idx, milestoneCount);
    const regex = new RegExp(`\\[${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\s*([^\\[]+)`, "i");
    const match = raw.match(regex);
    if (match && match[1]) return match[1].trim();

    // If multi-line notes without milestone tag
    const lines = raw.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length > idx && !raw.includes("[")) {
      return lines[idx];
    }

    if (idx === 0) return raw.replace(/\[Milestone \d+\]/gi, "").trim();
    return "";
  };

  const [milestones, setMilestones] = useState<MilestoneData[]>(() => {
    const initialFiles = project.deliverableFiles || [];
    const initialUrls = (project.deliverableUrls || []).filter(
      (u) => !initialFiles.some((f) => f.url === u)
    );

    return Array.from({ length: milestoneCount }, (_, idx) => {
      const msDb = dbMilestones[idx];
      let status: "pending" | "submitted" | "accepted" | "revision" = "pending";

      if (msDb?.status === "accepted" || isOverallAccepted) {
        status = "accepted";
      } else if (isOverallCompleted) {
        status = "submitted";
      } else if (msDb?.status === "revision" || isOverallRevision) {
        status = "revision";
      } else if (msDb?.status === "submitted" || initialFiles.length > 0 || initialUrls.length > 0) {
        status = "submitted";
      }

      // For milestone 0, give existing files/links if not partitioned
      const existingFiles = idx === 0 ? initialFiles : [];
      const links = idx === 0 ? initialUrls : [];
      const note = parseNotesForMilestone(idx);

      return {
        existingFiles,
        newFiles: [],
        links,
        note,
        status,
        clientNote: isOverallCompleted ? "" : (msDb?.clientNote || ""),
        submitted: status !== "pending",
      };
    });
  });

  const [activeTab, setActiveTab] = useState(() => {
    for (let i = 0; i < milestoneCount; i++) {
      const msDb = dbMilestones[i];
      if (msDb?.status !== "accepted") {
        return i;
      }
    }
    return 0;
  });

  // ── helpers ──────────────────────────────────────────────────────────────
  const updateMilestone = (idx: number, patch: Partial<MilestoneData>) =>
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const currentMilestone = milestones[activeTab];
  const totalNewFilesSize = currentMilestone.newFiles.reduce((s, f) => s + (f.size || 0), 0);

  const isCurrentRevision = !isOverallCompleted && !isCompleted && (currentMilestone.status === "revision" || isOverallRevision);

  // An active tab is locked if already accepted or submitted (unless in active revision)
  const isCurrentLocked =
    !isCurrentRevision &&
    (currentMilestone.status === "accepted" || currentMilestone.status === "submitted" || isOverallCompleted || isCompleted);

  const hasCurrentContent =
    currentMilestone.existingFiles.length > 0 ||
    currentMilestone.newFiles.length > 0 ||
    currentMilestone.links.length > 0 ||
    currentMilestone.note.trim().length > 0;

  const canMarkReady = hasCurrentContent;

  const isTabUnlocked = (idx: number) => {
    if (idx === 0) return true;
    const prev = milestones[idx - 1];
    return prev.status === "accepted";
  };

  const hasAnyNewContent = milestones.some(
    (m) => m.newFiles.length > 0 || (m.status === "revision" && (m.links.length > 0 || m.note.trim().length > 0))
  );

  const allSubmitted = milestones.every((m) => m.submitted || m.status === "submitted" || m.status === "accepted");

  // ── file handling ─────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (isCurrentLocked) return;

    const incoming = Array.from(e.target.files).filter((file) => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`"${file.name}" not supported. Use PDF, DOCX, DOC, ZIP, TXT`);
        return false;
      }
      return true;
    });

    if (!incoming.length) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newTotal =
      totalNewFilesSize + incoming.reduce((s, f) => s + (f.size || 0), 0);
    if (newTotal > MAX_TOTAL_SIZE_BYTES) {
      setSizeLimitInfo({ current: newTotal, max: MAX_TOTAL_SIZE_BYTES });
      setSizeLimitModal(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    updateMilestone(activeTab, { newFiles: [...currentMilestone.newFiles, ...incoming] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Spinning delete with 400ms delay for feel
  const handleDeleteNewFile = async (tabIdx: number, fileIdx: number) => {
    const key = `new-${tabIdx}-${fileIdx}`;
    setDeletingFile(key);
    await new Promise((r) => setTimeout(r, 380));
    setMilestones((prev) =>
      prev.map((m, i) =>
        i === tabIdx
          ? { ...m, newFiles: m.newFiles.filter((_, fi) => fi !== fileIdx) }
          : m
      )
    );
    setDeletingFile(null);
  };

  const handleDeleteExistingFile = async (tabIdx: number, fileIdx: number) => {
    const key = `exist-${tabIdx}-${fileIdx}`;
    setDeletingFile(key);
    await new Promise((r) => setTimeout(r, 380));
    setMilestones((prev) =>
      prev.map((m, i) =>
        i === tabIdx
          ? { ...m, existingFiles: m.existingFiles.filter((_, fi) => fi !== fileIdx) }
          : m
      )
    );
    setDeletingFile(null);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim() || isCurrentLocked) return;
    try {
      new URL(newLink.trim());
      updateMilestone(activeTab, {
        links: [...currentMilestone.links, newLink.trim()],
      });
      setNewLink("");
    } catch {
      toast.error("Please enter a valid URL (e.g. https://github.com/...)");
    }
  };

  const handleRemoveLink = (linkIdx: number) => {
    if (isCurrentLocked) return;
    updateMilestone(activeTab, {
      links: currentMilestone.links.filter((_, i) => i !== linkIdx),
    });
  };

  // ── mark current tab as locally ready ─────────────────────────────────────
  const handleMarkReady = () => {
    if (!canMarkReady) return;
    updateMilestone(activeTab, { submitted: true });
    const label = getMilestoneLabel(activeTab, milestoneCount);
    toast.success(`${label} marked as ready ✓`);
    if (activeTab < milestoneCount - 1) setActiveTab(activeTab + 1);
  };

  // ── final upload & persist to DB ──────────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (isUploading) return;

    setIsUploading(true);
    setUploadProgress(10);
    setCurrentFileStep("Processing deliverable files...");

    const allDeliverableFiles: DeliverableFile[] = [];
    const allLinks: string[] = [];
    const notesParts: string[] = [];

    try {
      let filesProcessed = 0;
      const totalNewFiles = milestones.reduce((s, m) => s + m.newFiles.length, 0);

      for (let mi = 0; mi < milestones.length; mi++) {
        const m = milestones[mi];
        const label = getMilestoneLabel(mi, milestoneCount);
        if (m.note.trim()) {
          if (milestoneCount > 1) {
            notesParts.push(`[${label}] ${m.note.trim()}`);
          } else {
            notesParts.push(m.note.trim());
          }
        }

        // Add links
        m.links.forEach((link) => {
          if (link && !allLinks.includes(link)) {
            allLinks.push(link);
          }
        });

        // Add existing files
        m.existingFiles.forEach((ef) => {
          if (!allDeliverableFiles.some((f) => f.name === ef.name && f.url === ef.url)) {
            allDeliverableFiles.push(ef);
          }
        });

        // Process newly added files to base64
        for (const file of m.newFiles) {
          filesProcessed++;
          setCurrentFileStep(`Saving ${filesProcessed}/${totalNewFiles}: ${file.name}`);
          setUploadProgress(15 + Math.round((filesProcessed / (totalNewFiles || 1)) * 70));

          const base64Url = await toBase64(file);

          allDeliverableFiles.push({
            name: file.name,
            url: base64Url,
            size: file.size,
            type: file.type || "application/octet-stream",
            uploadedAt: new Date().toISOString(),
          });
        }

        // Mark this milestone as submitted in state
        updateMilestone(mi, {
          status: "submitted",
          submitted: true,
          clientNote: "",
          existingFiles: [
            ...m.existingFiles,
            ...m.newFiles.map((f) => ({
              name: f.name,
              url: "",
              size: f.size,
              type: f.type,
              uploadedAt: new Date().toISOString(),
            })),
          ],
          newFiles: [],
        });
      }

      setCurrentFileStep("Saving to database...");
      setUploadProgress(90);

      await markProjectComplete(project.projectId, {
        deliverableUrls: allLinks,
        deliverableFiles: allDeliverableFiles,
        completionNotes: notesParts.join("\n"),
      });

      setUploadProgress(100);
      setCurrentFileStep("Submitted successfully!");
      setIsCompleted(true);

      if (milestoneCount === 1) {
        toast.success("Project deliverables submitted! Client has been notified.");
      } else {
        toast.success(`All ${milestoneCount} milestones submitted! Client has been notified.`);
      }

      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit deliverables");
      setIsUploading(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Size Limit Exceeded Modal */}
      {sizeLimitModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            style={{ maxWidth: "400px", width: "100%" }}
            className="rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl space-y-4"
          >
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30">
                <AlertTriangle className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">File Size Limit Exceeded</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Total selected files exceed the {MAX_TOTAL_SIZE_MB} MB limit per milestone.
                </p>
              </div>
              <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Your Selection</span>
                  <span className="font-bold text-red-500">{formatFileSize(sizeLimitInfo.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Maximum Allowed</span>
                  <span className="font-bold text-foreground">{formatFileSize(sizeLimitInfo.max)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Remove some files to stay under <strong>{MAX_TOTAL_SIZE_MB} MB</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setSizeLimitModal(false)}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 transition-all cursor-pointer shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Deliverable Upload Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div
          style={{ maxWidth: "560px", width: "100%", maxHeight: "90vh" }}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-5 py-4 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-primary font-bold">{project.projectId}</span>
                {/* Status Badges */}
                {isOverallAccepted ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    All Milestones Accepted ✓
                  </span>
                ) : isCurrentRevision ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30">
                    <RotateCcw className="w-3 h-3" />
                    Revision Requested
                  </span>
                ) : isOverallCompleted || isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    <Clock className="w-3 h-3" />
                    Pending Client Review
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    In Progress
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-foreground mt-1 leading-tight">{project.title}</h3>
              <span className="inline-block mt-1 text-[10px] font-bold tracking-wide text-primary bg-primary/10 border border-primary/20 rounded-md px-2.5 py-0.5">
                {(() => {
                  const t = (project.paymentTerms || "").toLowerCase();
                  if (milestoneCount === 3 || t.includes("three") || t === "3") {
                    return "Three Times Payment / 3 Milestones";
                  }
                  if (milestoneCount === 2 || t.includes("two") || t === "2") {
                    return "Two Times Payment / 2 Milestones";
                  }
                  return "One Time Payment / 1 Milestone";
                })()}
              </span>
            </div>
            <button
              onClick={!isUploading ? onClose : undefined}
              disabled={isUploading && !isCompleted}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0 ml-3 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Milestone Tabs */}
          {milestoneCount > 1 && (
            <div className="flex gap-0.5 px-5 pt-3 shrink-0 overflow-x-auto border-b border-border pb-0">
              {milestones.map((m, idx) => {
                const unlocked = isTabUnlocked(idx);
                const isActive = activeTab === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setActiveTab(idx)}
                    className={[
                      "flex-1 flex items-center justify-center gap-1.5 rounded-t-xl border-b-2 px-3 py-2.5 text-[11px] font-bold transition-all whitespace-nowrap",
                      isActive
                        ? "border-primary text-primary bg-primary/5 cursor-pointer"
                        : unlocked
                        ? "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                        : "border-transparent text-muted-foreground/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {m.status === "accepted" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : m.status === "revision" && !isOverallCompleted ? (
                      <RotateCcw className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    ) : m.status === "submitted" || isOverallCompleted ? (
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                    )}
                    <span>{getMilestoneLabel(idx, milestoneCount)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Milestone Payment Subheader */}
          {(() => {
            const totalB = Number((project as any).adminBudget || (project as any).price || 0);
            const perMs = milestoneCount > 0 && totalB > 0 ? totalB / milestoneCount : 0;
            return (
              <div className="flex items-center justify-between bg-primary/5 border-b border-primary/20 px-5 py-2 text-xs shrink-0">
                <span className="font-bold text-muted-foreground">
                  {getMilestoneLabel(activeTab, milestoneCount)} Payout:
                </span>
                <span className="font-extrabold text-primary text-sm">
                  {(project as any).currency || "USD"} ${perMs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            );
          })()}

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* STATUS BANNER */}
            {currentMilestone.status === "accepted" || isOverallAccepted ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
                  <CheckCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">
                      {getMilestoneLabel(activeTab, milestoneCount)} — Milestone Accepted
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
                      Accepted Stamp
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">
                    Deliverables approved by client &amp; escrow payment released to your wallet.
                  </p>
                  {currentMilestone.clientNote && (
                    <p className="text-xs text-emerald-900 dark:text-emerald-100 mt-1.5 font-medium italic bg-emerald-500/15 p-2 rounded-lg border border-emerald-500/25">
                      Client Note: "{currentMilestone.clientNote}"
                    </p>
                  )}
                </div>
              </div>
            ) : isCurrentRevision ? (
              <div className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3.5 text-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 shrink-0">
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-bold text-orange-700 dark:text-orange-300">
                    Not Accepted — Revision Requested on {getMilestoneLabel(activeTab, milestoneCount)}
                  </p>
                  {currentMilestone.clientNote && (
                    <p className="text-xs text-orange-800 dark:text-orange-200 mt-1 font-medium italic">
                      Client Revision Note: "{currentMilestone.clientNote}"
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1">
                    Please upload your revised deliverables below and submit.
                  </p>
                </div>
              </div>
            ) : currentMilestone.status === "submitted" || isOverallCompleted || isCompleted ? (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 shrink-0">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-amber-700 dark:text-amber-400">
                    {getMilestoneLabel(activeTab, milestoneCount)} — Pending for Review / Accept
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    Your deliverables have been submitted. The client is currently reviewing them.
                  </p>
                </div>
              </div>
            ) : currentMilestone.submitted ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-xs">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {getMilestoneLabel(activeTab, milestoneCount)} marked as ready.
                </span>
              </div>
            ) : null}

            {/* PREVIOUSLY SUBMITTED FILES WITH DOWNLOAD */}
            {currentMilestone.existingFiles.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-foreground">
                  Submitted Deliverable Files ({currentMilestone.existingFiles.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {currentMilestone.existingFiles.map((file, i) => {
                    const delKey = `exist-${activeTab}-${i}`;
                    const isDeleting = deletingFile === delKey;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="shrink-0">{getFileIcon(file.name)}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{file.name}</p>
                            {file.size && (
                              <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {/* Active Download link */}
                          {file.url ? (
                            <a
                              href={file.url}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1 font-bold text-[11px]"
                              title="Download File"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>Download</span>
                            </a>
                          ) : null}

                          {/* Delete if in revision */}
                          {isCurrentRevision && (
                            <button
                              type="button"
                              title="Remove File"
                              disabled={isDeleting}
                              onClick={() => handleDeleteExistingFile(activeTab, i)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NEW FILES TO UPLOAD (ENABLED IF NOT ACCEPTED OR IF IN REVISION) */}
            {(!isCurrentLocked || isCurrentRevision) && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Upload Deliverable Files{" "}
                    {currentMilestone.existingFiles.length === 0 && <span className="text-red-500">*</span>}
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    PDF · DOCX · DOC · ZIP · TXT &nbsp;|&nbsp; Max {MAX_TOTAL_SIZE_MB} MB
                  </span>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,.doc,.docx,.zip,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4 hover:border-primary/60 hover:bg-muted/30 cursor-pointer transition-all text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-1.5">
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">Click to browse or drag &amp; drop</p>
                  <p className="text-[11px] text-muted-foreground">
                    Multiple files · PDF, DOCX, DOC, ZIP, TXT
                  </p>
                </div>

                {currentMilestone.newFiles.length > 0 && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {currentMilestone.newFiles.length} new file(s) selected
                    </span>
                    <span
                      className={`font-bold ${
                        totalNewFilesSize > MAX_TOTAL_SIZE_BYTES ? "text-red-500" : "text-foreground"
                      }`}
                    >
                      {formatFileSize(totalNewFilesSize)} / {MAX_TOTAL_SIZE_MB} MB
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* NEWLY SELECTED FILES LIST */}
            {currentMilestone.newFiles.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">
                    Ready to Upload ({currentMilestone.newFiles.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => updateMilestone(activeTab, { newFiles: [] })}
                    className="text-[11px] text-red-500 hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {currentMilestone.newFiles.map((file, i) => {
                    const delKey = `new-${activeTab}-${i}`;
                    const isDeleting = deletingFile === delKey;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="shrink-0">{getFileIcon(file.name)}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{file.name}</p>
                            <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            title="Download local"
                            onClick={() => downloadLocalFile(file)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Remove file"
                            disabled={isDeleting || Boolean(deletingFile)}
                            onClick={() => handleDeleteNewFile(activeTab, i)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EXTERNAL LINKS */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                External Links{" "}
                <span className="normal-case font-normal text-muted-foreground">
                  (GitHub, Figma, Live Demo)
                </span>
              </label>

              {(!isCurrentLocked || isCurrentRevision) && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="url"
                      value={newLink}
                      onChange={(e) => setNewLink(e.target.value)}
                      placeholder="https://github.com/username/project"
                      className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLink(e);
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddLink}
                    className="shrink-0 cursor-pointer"
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
              )}

              {currentMilestone.links.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto mt-1">
                  {currentMilestone.links.map((link, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate max-w-xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{link}</span>
                      </a>
                      {(!isCurrentLocked || isCurrentRevision) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(i)}
                          className="text-muted-foreground hover:text-red-500 p-1 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* COMPLETION NOTES */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Completion Notes{" "}
                  {(!isCurrentLocked || isCurrentRevision) && <span className="text-red-500">*</span>}
                </label>
                {(!isCurrentLocked || isCurrentRevision) && (
                  <span
                    className={`text-[11px] font-semibold ${
                      currentMilestone.note.length >= MAX_NOTE_CHARS ? "text-red-500" : "text-muted-foreground"
                    }`}
                  >
                    {currentMilestone.note.length}/{MAX_NOTE_CHARS}
                  </span>
                )}
              </div>
              {isCurrentLocked && !isCurrentRevision ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentMilestone.note || <span className="text-muted-foreground italic">No notes provided.</span>}
                </div>
              ) : (
                <>
                  <textarea
                    value={currentMilestone.note}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_NOTE_CHARS)
                        updateMilestone(activeTab, { note: e.target.value });
                    }}
                    placeholder="Add setup instructions, deploy notes, or handover comments..."
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                  />
                  {currentMilestone.note.trim().length === 0 && (
                    <p className="text-[11px] text-amber-500 mt-0.5">Completion note is required to submit.</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3.5 bg-muted/20 shrink-0 space-y-2.5">
            {/* Mark milestone ready — only for multi-milestone and editable */}
            {milestoneCount > 1 && (!isCurrentLocked || isCurrentRevision) && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground">
                  {milestones.filter((m) => m.submitted).length}/{milestoneCount} milestones ready
                </span>
                <button
                  type="button"
                  disabled={!canMarkReady || currentMilestone.submitted}
                  onClick={handleMarkReady}
                  className={[
                    "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all",
                    canMarkReady && !currentMilestone.submitted
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer"
                      : currentMilestone.submitted
                      ? "bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-500/30"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  ].join(" ")}
                >
                  {currentMilestone.submitted ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Milestone Ready
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3.5 w-3.5" /> Mark Milestone Ready
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isUploading}
                className="cursor-pointer"
              >
                Close
              </Button>

              {/* Submit / Resubmit button */}
              {(!isCurrentLocked || isCurrentRevision || hasAnyNewContent) && (
                <Button
                  size="sm"
                  onClick={handleFinalSubmit}
                  disabled={!hasCurrentContent || isUploading}
                  className="bg-primary hover:bg-primary/90 text-white font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving Deliverables...
                    </>
                  ) : isCurrentRevision ? (
                    <>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Resubmit Revision
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {milestoneCount === 1 ? "Submit Deliverables" : "Submit All Milestones"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && !isCompleted && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div
            style={{ maxWidth: "380px", width: "100%" }}
            className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-center"
          >
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-8 w-8 animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground">Saving Deliverables</h4>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs mx-auto">{currentFileStep}</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary font-extrabold text-sm">{uploadProgress}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Please do not close this window while files are being securely saved.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
