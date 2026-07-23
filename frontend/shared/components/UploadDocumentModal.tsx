"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Check, Image as ImageIcon, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (url: string) => void;
  existingUrl?: string;
}

export function UploadDocumentModal({ open, onClose, onUploadSuccess, existingUrl }: UploadDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(existingUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/i)) {
      toast.error("Only PNG, JPG, and JPEG images are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!previewUrl) {
      toast.error("Please select a document image first.");
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      onUploadSuccess(previewUrl);
      toast.success("Document Uploaded Successfully");
      setIsUploading(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full bg-card rounded-2xl shadow-2xl border border-border p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200"
        style={{ maxWidth: '360px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div>
            <h3 className="text-base font-bold text-foreground">Upload ID Card / Passport</h3>
            <p className="text-xs text-muted-foreground">Select a clear PNG, JPG, or JPEG file</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drop / Preview Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center min-h-[120px] rounded-xl border-2 border-dashed p-3 cursor-pointer transition-all ${
            previewUrl
              ? "border-primary/50 bg-muted/30"
              : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileSelect}
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative w-full flex flex-col items-center gap-3">
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-h-52 w-full object-contain rounded-lg border border-border bg-black/5"
              />
              <span className="text-xs text-primary font-semibold group-hover:underline flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Click to change document
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2 py-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Click to upload document</p>
              <p className="text-xs text-muted-foreground">Supports PNG, JPG, JPEG (Max 10MB)</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-input bg-background hover:bg-muted text-foreground text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!previewUrl || isUploading}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDocumentModal;
