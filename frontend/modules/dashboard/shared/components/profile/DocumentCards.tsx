"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, Upload, FileImage, FileText, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  downloadFile,
  getProfileDocuments,
  getProfileOverrides,
  setProfileDocument,
  saveProfileOverrides,
  clearProfileDocuments,
  type StoredDocument,
} from "@/src/shared/utils/profile-storage";
import { completeUserProfile } from "@/src/shared/server/AuthService";
import { PROFILE_UPDATED_EVENT } from "../../hooks/use-profile-display";

interface DocumentCardsProps {
  userId: string;
  /** DB-sourced document URL from user.idDocument — always displayed even after session refresh */
  dbDocumentUrl?: string;
  onUpload?: (doc: StoredDocument) => void;
  onRemove?: () => void;
  revision?: number;
}

function parseDocumentUrl(url: string): { front: string; back: string; isDual: boolean } {
  if (!url) return { front: "", back: "", isDual: false };
  if (url.startsWith("[") && url.endsWith("]")) {
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed)) {
        return {
          front: parsed[0] || "",
          back: parsed[1] || "",
          isDual: true,
        };
      }
    } catch {}
  }
  return { front: url, back: "", isDual: false };
}

function computeUpdatedDocUrl(currentUrl: string, newUrl: string, slot: "front" | "back" | "single"): string {
  if (slot === "single") return newUrl;
  const { front, back } = parseDocumentUrl(currentUrl);
  const updatedFront = slot === "front" ? newUrl : front;
  const updatedBack = slot === "back" ? newUrl : back;

  if (updatedFront && updatedBack) {
    return JSON.stringify([updatedFront, updatedBack]);
  } else if (updatedFront) {
    return JSON.stringify([updatedFront, ""]);
  } else if (updatedBack) {
    return JSON.stringify(["", updatedBack]);
  }
  return "";
}

function computeUrlAfterDelete(currentUrl: string, docId: string): string {
  if (!currentUrl) return "";
  const { front, back, isDual } = parseDocumentUrl(currentUrl);

  if (isDual) {
    let newFront = front;
    let newBack = back;
    if (docId.includes("front")) newFront = "";
    if (docId.includes("back")) newBack = "";

    if (newFront && newBack) return JSON.stringify([newFront, newBack]);
    if (newFront) return JSON.stringify([newFront, ""]);
    if (newBack) return JSON.stringify(["", newBack]);
    return "";
  }

  return "";
}

export default function DocumentCards({ userId, dbDocumentUrl, onUpload, onRemove, revision }: DocumentCardsProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadSlot, setUploadSlot] = useState<"front" | "back" | "single">("single");
  const uploadRef = useRef<HTMLInputElement>(null);

  const { front: dbFront, back: dbBack, isDual: isDbDual } = parseDocumentUrl(dbDocumentUrl || "");

  useEffect(() => {
    if (!userId) return;

    // If documentUrl was explicitly set to empty string by user deletion, show no documents
    const overrides = getProfileOverrides(userId);
    if (overrides.documentUrl === "") {
      setDocuments([]);
      return;
    }

    const allDocs: StoredDocument[] = [];

    // 1. DB-sourced documents
    if (dbDocumentUrl && typeof dbDocumentUrl === "string" && dbDocumentUrl.trim()) {
      const { front, back, isDual } = parseDocumentUrl(dbDocumentUrl);
      if (isDual) {
        if (front) {
          allDocs.push({
            id: "db-doc-front",
            name: "Front ID Document",
            type: "FRONT ID",
            url: front,
            uploadedAt: "On file",
            source: "db",
          });
        }
        if (back) {
          allDocs.push({
            id: "db-doc-back",
            name: "Back ID Document",
            type: "BACK ID",
            url: back,
            uploadedAt: "On file",
            source: "db",
          });
        }
      } else if (front) {
        allDocs.push({
          id: "db-doc",
          name: "ID Document",
          type: "ID DOCUMENT",
          url: front,
          uploadedAt: "On file",
          source: "db",
        });
      }
    }

    // 2. Local overrides fallback if no DB docs
    if (allDocs.length === 0) {
      const localDocs = getProfileDocuments(userId);
      localDocs.forEach(doc => {
        const fileUrl = doc.url || (doc as any).dataUrl || (doc as any).contentUrl;
        if (typeof fileUrl === "string" && fileUrl.startsWith("[") && fileUrl.endsWith("]")) {
          try {
            const parsed = JSON.parse(fileUrl);
            if (Array.isArray(parsed)) {
              if (parsed[0]) allDocs.push({ ...doc, id: `${doc.id}-front`, name: "Front ID Document", type: "FRONT ID", url: parsed[0] });
              if (parsed[1]) allDocs.push({ ...doc, id: `${doc.id}-back`, name: "Back ID Document", type: "BACK ID", url: parsed[1] });
              return;
            }
          } catch {}
        }
        if (fileUrl) allDocs.push(doc);
      });
    }

    setDocuments(allDocs);
  }, [userId, dbDocumentUrl, revision]);

  const handleDownload = (doc: StoredDocument) => {
    const fileUrl = doc.url || (doc as any).dataUrl || (doc as any).contentUrl;
    if (fileUrl && typeof fileUrl === "string") {
      downloadFile(fileUrl, doc.name || "document");
    }
  };

  const handleDelete = async (doc: StoredDocument) => {
    if (!userId || deletingId) return;

    setDeletingId(doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));

    try {
      const currentUrl = dbDocumentUrl || "";
      const updatedDocUrl = computeUrlAfterDelete(currentUrl, doc.id);

      // Save local overrides
      saveProfileOverrides(userId, { documentUrl: updatedDocUrl });

      // If all documents deleted, clear local documents storage
      if (!updatedDocUrl) {
        clearProfileDocuments(userId);
        setDocuments([]);
      }

      // Save to DB via completeUserProfile
      await completeUserProfile({
        idDocument: updatedDocUrl || null,
      }).catch(() => undefined);

      // Trigger global event so previews everywhere update instantly
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      }

      onRemove?.();
      toast.success(`${doc.name} successfully deleted`);
    } catch (error) {
      console.error("Failed to delete document", error);
      toast.error(`Failed to delete ${doc.name}`);
    } finally {
      setDeletingId(null);
    }
  };

  const triggerUploadForSlot = (slot: "front" | "back" | "single") => {
    setUploadSlot(slot);
    uploadRef.current?.click();
  };

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const newFileUrl = typeof reader.result === "string" ? reader.result : "";
      if (!newFileUrl) return;

      const docName = uploadSlot === "front" ? "Front ID Document" : uploadSlot === "back" ? "Back ID Document" : file.name;
      const docType = uploadSlot === "front" ? "FRONT ID" : uploadSlot === "back" ? "BACK ID" : "ID DOCUMENT";

      const doc: StoredDocument = {
        id: `doc-${Date.now()}`,
        type: docType,
        name: docName,
        mimeType: file.type,
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        url: newFileUrl,
        previewText: `Uploaded file: ${file.name}`,
      };

      const updatedDocUrl = computeUpdatedDocUrl(dbDocumentUrl || "", newFileUrl, uploadSlot);

      // Persist to DB & local overrides
      await completeUserProfile({ idDocument: updatedDocUrl }).catch(() => undefined);
      saveProfileOverrides(userId, { documentUrl: updatedDocUrl });
      setProfileDocument(userId, doc);

      // Dispatch global update event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      }

      onUpload?.(doc);
      toast.success(`${docName} uploaded successfully`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isPdf = (url?: string) => url?.toLowerCase().endsWith(".pdf");

  const hasFront = documents.some(d => d.id.includes("front"));
  const hasBack = documents.some(d => d.id.includes("back"));
  const isDualMode = isDbDual || (hasFront || hasBack);

  return (
    <>
      <div className="flex flex-col gap-4 p-6 pt-0 md:flex-row flex-wrap">
        {documents.length === 0 && (
          <div className="w-full rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-xs font-medium text-muted-foreground flex flex-col items-center justify-center gap-3">
            <p>No document uploaded yet. Upload your ID document to apply for KYC verification.</p>
            <button
              type="button"
              onClick={() => triggerUploadForSlot("single")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload ID Document
            </button>
          </div>
        )}

        {documents.map((doc) => {
          const fileUrl = doc.url || (doc as any).dataUrl || (doc as any).contentUrl;
          const isImage = fileUrl && !isPdf(fileUrl) && !fileUrl.startsWith("data:application");
          const isDeleting = deletingId === doc.id;

          return (
            <div
              key={doc.id}
              className="flex flex-1 min-w-[240px] max-w-sm flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden relative group"
            >
              {/* Preview */}
              {isImage && fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="block relative">
                  <div className="h-36 w-full bg-muted overflow-hidden">
                    <img
                      src={fileUrl}
                      alt={doc.name}
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </a>
              ) : (
                <div className="h-36 w-full bg-muted/40 flex items-center justify-center">
                  {isPdf(fileUrl) ? (
                    <FileText className="h-10 w-10 text-muted-foreground/60" />
                  ) : (
                    <FileImage className="h-10 w-10 text-muted-foreground/60" />
                  )}
                </div>
              )}

              {/* Deleting overlay */}
              {isDeleting && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-semibold text-foreground">Deleting...</span>
                </div>
              )}

              {/* Info & Actions row */}
              <div className="flex items-center justify-between p-3 gap-2 bg-card border-t border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{doc.type}</p>
                  <p className="truncate text-sm font-semibold text-foreground">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {doc.sizeLabel ? `${doc.sizeLabel} • ` : ""}Uploaded: {doc.uploadedAt}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={isDeleting}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors disabled:opacity-50"
                    aria-label={`Download ${doc.name}`}
                    title={`Download ${doc.name}`}
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={isDeleting}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                    aria-label={`Delete ${doc.name}`}
                    title={`Delete ${doc.name}`}
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty slots for missing front or back document in dual-document mode */}
        {isDualMode && !hasFront && (
          <div
            onClick={() => triggerUploadForSlot("front")}
            className="flex flex-1 min-w-[240px] max-w-sm flex-col items-center justify-center min-h-[180px] rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer p-4 text-center group"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Add Front ID Document</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to upload replacement</p>
          </div>
        )}

        {isDualMode && !hasBack && (
          <div
            onClick={() => triggerUploadForSlot("back")}
            className="flex flex-1 min-w-[240px] max-w-sm flex-col items-center justify-center min-h-[180px] rounded-xl border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer p-4 text-center group"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">Add Back ID Document</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click to upload replacement</p>
          </div>
        )}
      </div>

      <input
        ref={uploadRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleUpload}
      />
    </>
  );
}

export function DocumentUploadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
    >
      <Upload className="h-4 w-4" />
      Upload document
    </button>
  );
}
