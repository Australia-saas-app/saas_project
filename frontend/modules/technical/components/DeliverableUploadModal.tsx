"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { markProjectComplete } from "../services/technical.services";

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
    paymentTerms?: string;
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

function getMilestoneLabel(index: number, total: number): string {
  if (total === 1) return "One Time Payment / Milestone 1";
  const ordinals = ["First", "Second", "Third"];
  return `${ordinals[index] ?? `#${index + 1}`} Time Payment`;
}

interface MilestoneData {
  files: File[];
  links: string[];
  note: string;
  submitted: boolean;       // locally marked ready
  finalSubmitted: boolean;  // fully uploaded to DB
}

function emptyMilestone(): MilestoneData {
  return { files: [], links: [], note: "", submitted: false, finalSubmitted: false };
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
  const milestoneCount = getMilestoneCount(project.paymentTerms);

  const [milestones, setMilestones] = useState<MilestoneData[]>(() =>
    Array.from({ length: milestoneCount }, emptyMilestone)
  );
  const [activeTab, setActiveTab] = useState(0);
  const [newLink, setNewLink] = useState("");

  // Per-file delete spinner: key = `${tabIdx}-${fileIdx}`
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileStep, setCurrentFileStep] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const [sizeLimitModal, setSizeLimitModal] = useState(false);
  const [sizeLimitInfo, setSizeLimitInfo] = useState({ current: 0, max: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  const updateMilestone = (idx: number, patch: Partial<MilestoneData>) =>
    setMilestones((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const currentMilestone = milestones[activeTab];
  const isCurrentFinalSubmitted = currentMilestone.finalSubmitted;
  const totalSelectedSize = currentMilestone.files.reduce((s, f) => s + (f.size || 0), 0);

  const hasCurrentContent =
    currentMilestone.files.length > 0 || currentMilestone.links.length > 0 || currentMilestone.note.trim().length > 0;
  const canMarkReady = !isCurrentFinalSubmitted && hasCurrentContent;

  const isTabUnlocked = (idx: number) => idx === 0 || milestones[idx - 1]?.submitted;
  const hasAnyContent = milestones.some(
    (m) => m.files.length > 0 || m.links.length > 0 || m.note.trim().length > 0
  );
  const allSubmitted = milestones.every(
    (m) => m.submitted || m.files.length > 0 || m.links.length > 0 || m.note.trim().length > 0
  );
  const allFinalSubmitted = milestones.every((m) => m.finalSubmitted);

  // ── file handling ─────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (isCurrentFinalSubmitted) return; // locked after final submit

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
      totalSelectedSize + incoming.reduce((s, f) => s + (f.size || 0), 0);
    if (newTotal > MAX_TOTAL_SIZE_BYTES) {
      setSizeLimitInfo({ current: newTotal, max: MAX_TOTAL_SIZE_BYTES });
      setSizeLimitModal(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    updateMilestone(activeTab, { files: [...currentMilestone.files, ...incoming] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Spinning delete with 400ms delay for feel
  const handleDeleteFile = async (tabIdx: number, fileIdx: number) => {
    const key = `${tabIdx}-${fileIdx}`;
    setDeletingFile(key);
    await new Promise((r) => setTimeout(r, 420));
    setMilestones((prev) =>
      prev.map((m, i) =>
        i === tabIdx
          ? { ...m, files: m.files.filter((_, fi) => fi !== fileIdx) }
          : m
      )
    );
    setDeletingFile(null);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim() || isCurrentFinalSubmitted) return;
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
    if (isCurrentFinalSubmitted) return;
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

    if (!hasAnyContent) {
      toast.error("Please add at least one file, link, or note before submitting.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setCurrentFileStep("Processing deliverable files...");

    const allDeliverableFiles: DeliverableFile[] = [
      ...(project.deliverableFiles || []),
    ];
    const allLinks: string[] = [
      ...(project.deliverableUrls || []).filter(
        (u) => !(project.deliverableFiles || []).some((f) => f.url === u)
      ),
    ];
    const notesParts: string[] = [];

    try {
      let filesProcessed = 0;
      const totalFiles = milestones.reduce((s, m) => s + m.files.length, 0);

      for (let mi = 0; mi < milestones.length; mi++) {
        const m = milestones[mi];
        const label = getMilestoneLabel(mi, milestoneCount);
        if (m.note.trim()) {
          notesParts.push(`[${label}] ${m.note.trim()}`);
        }
        m.links.forEach((link) => {
          if (link && !allLinks.includes(link)) {
            allLinks.push(link);
          }
        });

        for (const file of m.files) {
          filesProcessed++;
          setCurrentFileStep(
            `Saving ${filesProcessed}/${totalFiles}: ${file.name}`
          );
          setUploadProgress(
            15 + Math.round((filesProcessed / (totalFiles || 1)) * 70)
          );

          // Convert to base64 Data URL (same as CreateProjectLayout.tsx)
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
        updateMilestone(mi, { submitted: true, finalSubmitted: true });
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
        toast.success(
          `All ${milestoneCount} milestones submitted! Client has been notified.`
        );
      }

      // Signal parent to refresh
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
                <h4 className="text-base font-bold text-foreground">
                  File Size Limit Exceeded
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Total selected files exceed the {MAX_TOTAL_SIZE_MB} MB limit per milestone.
                </p>
              </div>
              <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">
                    Your Selection
                  </span>
                  <span className="font-bold text-red-500">
                    {formatFileSize(sizeLimitInfo.current)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">
                    Maximum Allowed
                  </span>
                  <span className="font-bold text-foreground">
                    {formatFileSize(sizeLimitInfo.max)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Remove some files to stay under{" "}
                  <strong>{MAX_TOTAL_SIZE_MB} MB</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setSizeLimitModal(false)}
                className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-2.5 text-sm cursor-pointer shadow-md transition-colors"
              >
                OK, Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
        <div
          style={{ maxWidth: "520px", width: "100%", maxHeight: "90vh" }}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl my-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border px-5 py-4 shrink-0">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground leading-tight">
                Submit Project Deliverables
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">
                {project.title}
              </p>
              {project.paymentTerms && (
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-primary bg-primary/10 rounded-md px-2 py-0.5">
                  {project.paymentTerms}
                </span>
              )}
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
                // After final submit: all tabs lockable, only allow switching between finalSubmitted ones
                const unlocked = isCompleted
                  ? m.finalSubmitted
                  : isTabUnlocked(idx);
                const isActive = activeTab === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setActiveTab(idx)}
                    className={[
                      "flex-1 flex items-center justify-center gap-1.5 rounded-t-xl border-b-2 px-3 py-2.5 text-[11px] font-bold transition-all",
                      isActive
                        ? "border-primary text-primary bg-primary/5 cursor-pointer"
                        : unlocked
                        ? "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
                        : "border-transparent text-muted-foreground/40 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {m.finalSubmitted ? (
                      <CheckCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : m.submitted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    ) : unlocked ? (
                      <Unlock className="h-3 w-3 shrink-0" />
                    ) : (
                      <Lock className="h-3 w-3 shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {getMilestoneLabel(idx, milestoneCount)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Final submitted success banner */}
            {isCompleted && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                  <CheckCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-700 dark:text-emerald-300">
                      All deliverables submitted &amp; saved to database!
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      The client has been notified and will review your work.
                      You can close this window.
                    </p>
                  </div>
                </div>
                {/* Per-milestone submission status */}
                {milestoneCount > 1 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Milestone Status</p>
                    {milestones.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{getMilestoneLabel(idx, milestoneCount)}</span>
                        {m.finalSubmitted ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Submitted — Pending for Review / Accept
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-muted border border-border text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            Not Submitted
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {milestoneCount === 1 && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    <span className="font-semibold text-foreground">One Time Payment</span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Submitted — Pending for Review / Accept
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Per-milestone ready banner */}
            {!isCompleted && currentMilestone.submitted && (
              <div className="flex items-center gap-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3 text-xs">
                <CheckCircle2 className="h-4 w-4 text-indigo-500 shrink-0" />
                <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                  {getMilestoneLabel(activeTab, milestoneCount)} marked as ready.
                  {activeTab < milestoneCount - 1 &&
                    " You can still edit files before final submission."}
                </span>
              </div>
            )}

            {/* File Upload Drop Zone */}
            {!isCurrentFinalSubmitted && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Upload Files <span className="text-red-500">*</span>
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
                  onClick={() => !isCurrentFinalSubmitted && fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-4 hover:border-primary/60 hover:bg-muted/30 cursor-pointer transition-all text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-1.5">
                    <Upload className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    Click to browse or drag &amp; drop
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Multiple files · PDF, DOCX, DOC, ZIP, TXT
                  </p>
                </div>

                {currentMilestone.files.length > 0 && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {currentMilestone.files.length} file(s) selected
                    </span>
                    <span
                      className={`font-bold ${
                        totalSelectedSize > MAX_TOTAL_SIZE_BYTES
                          ? "text-red-500"
                          : "text-foreground"
                      }`}
                    >
                      {formatFileSize(totalSelectedSize)} / {MAX_TOTAL_SIZE_MB} MB
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Files List — always visible, Download always active, Delete locked after final submit */}
            {currentMilestone.files.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">
                    Selected Files ({currentMilestone.files.length})
                  </p>
                  {!isCurrentFinalSubmitted && (
                    <button
                      type="button"
                      onClick={() => updateMilestone(activeTab, { files: [] })}
                      className="text-[11px] text-red-500 hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {currentMilestone.files.map((file, i) => {
                    const delKey = `${activeTab}-${i}`;
                    const isDeleting = deletingFile === delKey;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="shrink-0">{getFileIcon(file.name)}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {/* Download — always active */}
                          <button
                            type="button"
                            title="Download"
                            onClick={() => downloadLocalFile(file)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          {/* Delete — spinner, disabled after final submit */}
                          <button
                            type="button"
                            title={isCurrentFinalSubmitted ? "Locked after submission" : "Remove file"}
                            disabled={isCurrentFinalSubmitted || isDeleting || Boolean(deletingFile)}
                            onClick={() =>
                              !isCurrentFinalSubmitted && handleDeleteFile(activeTab, i)
                            }
                            className={[
                              "rounded-lg p-1.5 transition-colors",
                              isCurrentFinalSubmitted
                                ? "text-muted-foreground/30 cursor-not-allowed"
                                : isDeleting
                                ? "text-red-400 cursor-wait"
                                : "text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 cursor-pointer",
                            ].join(" ")}
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

            {/* External Links — locked after final submit */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                External Links{" "}
                <span className="normal-case font-normal text-muted-foreground">
                  (Optional — GitHub, Figma, Live Demo)
                </span>
              </label>
              {!isCurrentFinalSubmitted && (
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
                        className="text-primary hover:underline truncate max-w-xs"
                      >
                        {link}
                      </a>
                      {!isCurrentFinalSubmitted && (
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

            {/* Notes — locked after final submit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Completion Notes{" "}
                  <span className={isCurrentFinalSubmitted ? "" : "text-red-500"}>
                    *
                  </span>
                </label>
                {!isCurrentFinalSubmitted && (
                  <span
                    className={`text-[11px] font-semibold ${
                      currentMilestone.note.length >= MAX_NOTE_CHARS
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {currentMilestone.note.length}/{MAX_NOTE_CHARS}
                  </span>
                )}
              </div>
              {isCurrentFinalSubmitted ? (
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground leading-relaxed">
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
                    <p className="text-[11px] text-amber-500 mt-0.5">
                      Completion note is required to submit.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border px-5 py-3.5 bg-muted/20 shrink-0 space-y-2.5">
            {/* Mark milestone ready — only for multi-milestone and not yet done */}
            {milestoneCount > 1 && !isCompleted && (
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
                disabled={isUploading && !isCompleted}
                className="cursor-pointer"
              >
                {isCompleted ? "Close" : "Cancel"}
              </Button>

              {!isCompleted && (
                <Button
                  size="sm"
                  onClick={handleFinalSubmit}
                  disabled={!hasAnyContent || isUploading}
                  className="bg-primary hover:bg-primary/90 text-white font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {milestoneCount === 1
                        ? "Submit Deliverables"
                        : "Submit All Milestones"}
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
              <h4 className="text-lg font-bold text-foreground">
                Uploading Deliverables
              </h4>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs mx-auto">
                {currentFileStep}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary font-extrabold text-sm">
                  {uploadProgress}%
                </span>
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
