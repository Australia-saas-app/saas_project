"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Check, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import SelectDropdown from "@/src/shared/components/SelectDropdown";

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (url: string, filename: string, sizeLabel: string, docType?: string) => void;
  existingUrl?: string;
  initialDocType?: string;
}

export function UploadDocumentModal({ open, onClose, onUploadSuccess, existingUrl, initialDocType }: UploadDocumentModalProps) {
  const [docType, setDocType] = useState<string>(initialDocType || "NID");
  const [frontUrl, setFrontUrl] = useState<string>("");
  const [backUrl, setBackUrl] = useState<string>("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialDocType) {
      setDocType(initialDocType);
    }
    if (existingUrl) {
      try {
        if (existingUrl.startsWith("[") && existingUrl.endsWith("]")) {
          const parsed = JSON.parse(existingUrl);
          if (Array.isArray(parsed)) {
            setFrontUrl(parsed[0] || "");
            setBackUrl(parsed[1] || "");
          }
        } else {
          setFrontUrl(existingUrl);
          setBackUrl("");
        }
      } catch {
        setFrontUrl(existingUrl);
        setBackUrl("");
      }
    } else {
      setFrontUrl("");
      setBackUrl("");
      setFrontFile(null);
      setBackFile(null);
    }
  }, [existingUrl, initialDocType, open]);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
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

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (side === "front") {
          setFrontFile(file);
          setFrontUrl(reader.result);
        } else {
          setBackFile(file);
          setBackUrl(reader.result);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleUpload = () => {
    if (!frontUrl || !backUrl) {
      toast.error("Please upload both Front and Back ID documents.");
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      const combinedUrl = JSON.stringify([frontUrl, backUrl]);
      const filename = "Identity Documents (Front & Back)";
      const sizeFront = frontFile ? frontFile.size : 0;
      const sizeBack = backFile ? backFile.size : 0;
      const sizeLabel = sizeFront || sizeBack ? `${((sizeFront + sizeBack) / 1024 / 1024).toFixed(1)} MB` : "";
      
      onUploadSuccess(combinedUrl, filename, sizeLabel, docType);
      toast.success("Documents Uploaded Successfully");
      setIsUploading(false);
      onClose();
    }, 400);
  };

  const renderUploadBox = (side: "front" | "back") => {
    const url = side === "front" ? frontUrl : backUrl;
    const inputRef = side === "front" ? frontInputRef : backInputRef;
    const title = side === "front" ? "Front ID" : "Back ID";

    return (
      <div className="flex flex-col gap-2 w-full">
        <span className="text-sm font-semibold text-foreground text-center">{title}</span>
        <div
          onClick={() => inputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center min-h-[140px] rounded-xl border-2 border-dashed p-3 cursor-pointer transition-all ${
            url
              ? "border-primary/50 bg-muted/30"
              : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={(e) => handleFileSelect(e, side)}
            className="hidden"
          />

          {url ? (
            <div className="relative w-full flex flex-col items-center gap-2">
              <img
                src={url}
                alt={`${title} preview`}
                className="w-full h-32 object-contain rounded-lg border border-border bg-black/5 dark:bg-white/5"
              />
              <span className="text-xs text-primary font-semibold group-hover:underline flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Change
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">Click to upload</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full bg-card rounded-2xl shadow-2xl border border-border p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200"
        style={{ maxWidth: '450px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Upload ID Documents</h3>
            <p className="text-xs text-muted-foreground">Select clear PNG, JPG, or JPEG files</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Document Type Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <span>Select Document Type</span>
            <span className="text-red-500 font-bold">*</span>
          </label>
          <SelectDropdown
            value={docType}
            onChange={setDocType}
            placeholder="Select Document Type..."
            options={[
              { label: "NID (National ID)", value: "NID" },
              { label: "Passport", value: "Passport" },
              { label: "Driving License", value: "Driving License" },
            ]}
          />
        </div>

        {/* Drop / Preview Area */}
        <div className="flex gap-4">
          {renderUploadBox("front")}
          {renderUploadBox("back")}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-3">
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
            disabled={!docType || !frontUrl || !backUrl || isUploading}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Uploading...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save Documents
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDocumentModal;
