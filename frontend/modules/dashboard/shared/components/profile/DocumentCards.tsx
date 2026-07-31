"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, Upload, FileImage, FileText } from "lucide-react";
import {
  downloadFile,
  getProfileDocuments,
  setProfileDocument,
  type StoredDocument,
} from "@/src/shared/utils/profile-storage";

interface DocumentCardsProps {
  userId: string;
  /** DB-sourced document URL from user.idDocument — always displayed even after session refresh */
  dbDocumentUrl?: string;
  onUpload?: (doc: StoredDocument) => void;
  onRemove?: () => void;
  revision?: number;
}

function parseDocumentUrl(url: string): { front: string; back?: string } | null {
  if (!url) return null;
  if (url.startsWith("[") && url.endsWith("]")) {
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed) && parsed.length >= 1) {
        return { front: parsed[0], back: parsed[1] };
      }
    } catch {}
  }
  return { front: url };
}

export default function DocumentCards({ userId, dbDocumentUrl, onUpload, onRemove, revision }: DocumentCardsProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;

    const allDocs: StoredDocument[] = [];

    // 1. DB-sourced document (persists across sessions — always prioritized)
    if (dbDocumentUrl && typeof dbDocumentUrl === "string" && dbDocumentUrl.trim()) {
      const parsed = parseDocumentUrl(dbDocumentUrl);
      if (parsed) {
        if (parsed.back) {
          allDocs.push({
            id: "db-doc-front",
            name: "Front ID Document",
            type: "ID DOCUMENT",
            url: parsed.front,
            uploadedAt: "On file",
            source: "db",
          });
          allDocs.push({
            id: "db-doc-back",
            name: "Back ID Document",
            type: "ID DOCUMENT",
            url: parsed.back,
            uploadedAt: "On file",
            source: "db",
          });
        } else {
          allDocs.push({
            id: "db-doc",
            name: "ID Document",
            type: "ID DOCUMENT",
            url: parsed.front,
            uploadedAt: "On file",
            source: "db",
          });
        }
      }
    }

    // 2. Local overrides (newly uploaded in this session, not yet persisted or in addition)
    if (allDocs.length === 0) {
      // Only fall back to localStorage docs if there's nothing from DB
      const localDocs = getProfileDocuments(userId);
      localDocs.forEach(doc => {
        const fileUrl = doc.url || (doc as any).dataUrl || (doc as any).contentUrl;
        if (typeof fileUrl === "string" && fileUrl.startsWith("[") && fileUrl.endsWith("]")) {
          try {
            const parsed = JSON.parse(fileUrl);
            if (Array.isArray(parsed) && parsed.length >= 2) {
              allDocs.push({ ...doc, id: `${doc.id}-front`, name: "Front ID Document", url: parsed[0] });
              allDocs.push({ ...doc, id: `${doc.id}-back`, name: "Back ID Document", url: parsed[1] });
              return;
            }
          } catch {}
        }
        allDocs.push(doc);
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

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const doc: StoredDocument = {
        id: `doc-${Date.now()}`,
        type: "UPLOADED",
        name: file.name,
        mimeType: file.type,
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        url: typeof reader.result === "string" ? reader.result : "",
        previewText: `Uploaded file: ${file.name}`,
      };
      setProfileDocument(userId, doc);
      setDocuments([doc]);
      onUpload?.(doc);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const isPdf = (url?: string) => url?.toLowerCase().endsWith(".pdf");

  return (
    <>
      <div className="flex flex-col gap-4 p-6 pt-0 md:flex-row flex-wrap">
        {documents.length === 0 && (
          <div className="w-full rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center text-xs font-medium text-muted-foreground">
            No document uploaded yet. Upload your ID document to apply for KYC verification.
          </div>
        )}
        {documents.map((doc) => {
          const fileUrl = doc.url || (doc as any).dataUrl || (doc as any).contentUrl;
          const isImage = fileUrl && !isPdf(fileUrl) && !fileUrl.startsWith("data:application");
          return (
            <div
              key={doc.id}
              className="flex flex-1 min-w-[240px] flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Preview */}
              {isImage && fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="block">
                  <div className="h-32 w-full bg-muted overflow-hidden">
                    <img
                      src={fileUrl}
                      alt={doc.name}
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </a>
              ) : (
                <div className="h-32 w-full bg-muted/40 flex items-center justify-center">
                  {isPdf(fileUrl) ? (
                    <FileText className="h-10 w-10 text-muted-foreground/60" />
                  ) : (
                    <FileImage className="h-10 w-10 text-muted-foreground/60" />
                  )}
                </div>
              )}

              {/* Info row */}
              <div className="flex items-center justify-between p-3 gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{doc.type}</p>
                  <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {doc.sizeLabel ? `${doc.sizeLabel} • ` : ""}Uploaded: {doc.uploadedAt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                  aria-label={`Download ${doc.name}`}
                  title={`Download ${doc.name}`}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
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
