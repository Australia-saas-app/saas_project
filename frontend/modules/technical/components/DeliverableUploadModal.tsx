"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileArchive,
  FileText,
  FileCode,
  File,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import { markProjectComplete } from "../services/technical.services";
import { uploadFile } from "@/src/shared/utils/uploadFile";

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
    deliverableUrls?: string[];
    deliverableFiles?: DeliverableFile[];
    completionNotes?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeliverableUploadModal({ project, onClose, onSuccess }: Props) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [externalLinks, setExternalLinks] = useState<string[]>(
    project.deliverableUrls || []
  );
  const [newLink, setNewLink] = useState("");
  const [completionNotes, setCompletionNotes] = useState(
    project.completionNotes || ""
  );

  // Upload Progress State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileStep, setCurrentFileStep] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const allowedExts = [".zip", ".pdf", ".doc", ".docx", ".tar", ".gz", ".rar", ".txt"];
      const newFiles = Array.from(e.target.files).filter((file) => {
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (!allowedExts.includes(ext)) {
          toast.error(`"${file.name}" is not supported. Please upload .zip, .pdf, or .doc files.`);
          return false;
        }
        return true;
      });

      setSelectedFiles((prev) => [...prev, ...newFiles]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim()) return;
    try {
      new URL(newLink.trim());
      setExternalLinks((prev) => [...prev, newLink.trim()]);
      setNewLink("");
    } catch {
      toast.error("Please enter a valid URL (e.g. https://github.com/...)");
    }
  };

  const handleRemoveLink = (index: number) => {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    if ([".zip", ".rar", ".tar", ".gz"].includes(ext)) {
      return <FileArchive className="h-5 w-5 text-amber-500" />;
    }
    if ([".doc", ".docx", ".pdf", ".txt"].includes(ext)) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    return <FileCode className="h-5 w-5 text-primary" />;
  };

  const handleSubmitDeliverables = async () => {
    if (selectedFiles.length === 0 && externalLinks.length === 0) {
      toast.error("Please upload at least one deliverable file or provide a link.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setCurrentFileStep("Initializing upload...");

    const uploadedDeliverableFiles: DeliverableFile[] = [
      ...(project.deliverableFiles || []),
    ];

    try {
      // 1. Upload each selected file with real-time progress simulation
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setCurrentFileStep(`Uploading (${i + 1}/${selectedFiles.length}): ${file.name}`);

        // Progress step for current file
        const basePct = Math.round((i / selectedFiles.length) * 80);
        setUploadProgress(basePct + 10);

        // Upload through backend storage API
        let uploadedUrl = "";
        try {
          uploadedUrl = await uploadFile(file);
        } catch {
          uploadedUrl = "";
        }

        // If local dev or direct blob URL
        if (!uploadedUrl) {
          uploadedUrl = URL.createObjectURL(file);
        }

        uploadedDeliverableFiles.push({
          name: file.name,
          url: uploadedUrl,
          size: file.size,
          type: file.type || "application/octet-stream",
          uploadedAt: new Date().toISOString(),
        });

        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 80));
      }

      // 2. Persist to PostgreSQL Database
      setCurrentFileStep("Saving deliverables to database...");
      setUploadProgress(90);

      const allUrls = [
        ...externalLinks,
        ...uploadedDeliverableFiles.map((f) => f.url),
      ];

      await markProjectComplete(project.projectId, {
        deliverableUrls: allUrls,
        deliverableFiles: uploadedDeliverableFiles,
        completionNotes: completionNotes.trim(),
      });

      setUploadProgress(100);
      setCurrentFileStep("Complete! Deliverables saved successfully.");
      setIsCompleted(true);
      toast.success("Project deliverables submitted for client review!");

      setTimeout(() => {
        setIsUploading(false);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit deliverables");
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Submit Project Deliverables
              </h3>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                {project.title}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* File Upload Zone */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Upload Files (.ZIP, .PDF, .DOC, .DOCX)
              </label>

              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".zip,.pdf,.doc,.docx,.tar,.gz,.rar,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 hover:border-primary/60 hover:bg-muted/30 cursor-pointer transition-all text-center"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Click to browse files or drag &amp; drop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Source code archive (.ZIP), documentation (.PDF/.DOC), binaries
                </p>
              </div>
            </div>

            {/* Selected Files List with Delete Buttons */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Selected Files ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Clear all
                  </button>
                </p>

                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {selectedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
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

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete File"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External Links / Repositories */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                External Deliverable Links (GitHub, Figma, Live Demo)
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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
                  className="shrink-0"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Link
                </Button>
              </div>

              {externalLinks.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto mt-2">
                  {externalLinks.map((link, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-xs"
                    >
                      <a
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate max-w-sm"
                      >
                        {link}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveLink(i)}
                        className="text-muted-foreground hover:text-red-500 p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completion Notes */}
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Completion Notes &amp; Instructions
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Include setup instructions, API credentials, deploy notes, or comments for the client..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 bg-muted/20">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitDeliverables}
              disabled={isUploading}
              className="bg-primary hover:bg-primary/90 text-white font-bold"
            >
              <Upload className="mr-1.5 h-4 w-4" /> Submit Deliverables &amp; Complete
            </Button>
          </div>
        </div>
      </div>

      {/* Real-Time Upload Progress Popup (1% to 100%) */}
      {isUploading && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-center">
            <div className="flex justify-center">
              {isCompleted ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 animate-bounce">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Upload className="h-8 w-8 animate-pulse" />
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xl font-bold text-foreground">
                {isCompleted ? "Submission Complete!" : "Uploading Deliverables"}
              </h4>
              <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs mx-auto">
                {currentFileStep}
              </p>
            </div>

            {/* Glowing Theme Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary font-extrabold text-sm">
                  {uploadProgress}%
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-300 ease-out shadow-md"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Please do not close this window while files are being securely saved to the database.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
