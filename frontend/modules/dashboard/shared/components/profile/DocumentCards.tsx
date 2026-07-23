"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import {
  downloadFile,
  getProfileDocuments,
  setProfileDocument,
  type StoredDocument,
} from "@/src/shared/utils/profile-storage";
import { completeUserProfile } from "@/src/shared/server/AuthService";

interface DocumentCardsProps {
  userId: string;
  onUpload?: (doc: StoredDocument) => void;
  onRemove?: () => void;
  revision?: number;
}

export default function DocumentCards({ userId, onUpload, onRemove, revision }: DocumentCardsProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);

  // Re-read documents whenever userId or revision changes
  useEffect(() => {
    if (!userId) return;
    setDocuments(getProfileDocuments(userId));
  }, [userId, revision]);

  const handleDownload = (doc: StoredDocument) => {
    const fileUrl = doc.url || doc.dataUrl || doc.contentUrl;
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
      // Replace any old document (override previous)
      setProfileDocument(userId, doc);
      setDocuments([doc]);
      onUpload?.(doc);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <div className="flex flex-col gap-4 p-6 pt-0 md:flex-row">
        {documents.length === 0 && (
          <div className="w-full rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center text-xs font-medium text-muted-foreground">
            No document uploaded yet.
          </div>
        )}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex flex-1 items-center justify-between rounded-lg border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {doc.type}
                </p>
                <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {doc.sizeLabel}{doc.sizeLabel && " • "}Uploaded: {doc.uploadedAt}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="ml-2 flex shrink-0 items-center gap-2">
              {/* Download only */}
              <button
                type="button"
                onClick={() => handleDownload(doc)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                aria-label={`Download ${doc.name}`}
                title={`Download ${doc.name}`}
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
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
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
    >
      <Upload className="h-4 w-4" />
      Upload document
    </button>
  );
}
