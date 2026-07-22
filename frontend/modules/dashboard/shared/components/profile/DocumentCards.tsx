"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, Eye, Upload } from "lucide-react";
import AppModal from "../AppModal";
import {
  downloadTextFile,
  getProfileDocuments,
  type StoredDocument,
} from "@/src/shared/utils/profile-storage";

interface DocumentCardsProps {
  userId: string;
  onUpload?: (doc: StoredDocument) => void;
}

export default function DocumentCards({ userId, onUpload }: DocumentCardsProps) {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [preview, setPreview] = useState<StoredDocument | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDocuments(getProfileDocuments(userId));
  }, [userId]);

  const handleDownload = (doc: StoredDocument) => {
    const fileUrl = doc.url || doc.dataUrl || doc.contentUrl;
    if (fileUrl && typeof fileUrl === "string" && (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:") || fileUrl.startsWith("http"))) {
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = doc.name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadTextFile(
        doc.name,
        doc.previewText ?? `${doc.type} document: ${doc.name}\nUploaded: ${doc.uploadedAt}`
      );
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
        sizeLabel: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        url: typeof reader.result === "string" ? reader.result : "",
        previewText: `Uploaded file: ${file.name}`,
      };
      onUpload?.(doc);
      setDocuments((prev) => [doc, ...prev]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <>
      <div className="flex flex-col gap-4 p-6 pt-0 md:flex-row">
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
                  {doc.sizeLabel} • Uploaded: {doc.uploadedAt}
                </p>
              </div>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-2">
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

      <AppModal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "Document"}
        description={preview?.type}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {preview?.previewText ?? "Document preview is not available for this file type."}
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {preview?.sizeLabel} • {preview?.uploadedAt}
        </p>
      </AppModal>
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
