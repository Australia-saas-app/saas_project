"use client";

import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";

type FileUploadProps = {
  onFileChange: (file: File | null) => void;
  name?: string;
  accept?: string;
  maxSizeMB?: number; // client-side max size check (default 10MB)
  disabled?: boolean;
  className?: string;
  label?: string;
};

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".zip"];

const FileUpload: React.FC<FileUploadProps> = ({
  onFileChange,
  name,
  accept = ".pdf,.doc,.docx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed",
  maxSizeMB = 10,
  disabled = false,
  className = "",
  label = "",
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validate = useCallback(
    (f: File) => {
      if (!f) return "No file selected";

      // File extension check
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      const isValidExt = ALLOWED_EXTENSIONS.includes(ext) || f.type.includes("pdf") || f.type.includes("zip") || f.type.includes("word");
      if (!isValidExt) {
        return "Invalid file format. Allowed formats: PDF, DOC, DOCX, ZIP.";
      }

      // Max size check (10MB)
      if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
        return `File too large (${(f.size / (1024 * 1024)).toFixed(1)}MB). Max ${maxSizeMB}MB allowed.`;
      }

      return null;
    },
    [maxSizeMB]
  );

  const applyFile = useCallback(
    (f: File | null) => {
      if (!f) {
        setFile(null);
        setError(null);
        onFileChange(null);
        return;
      }
      const err = validate(f);
      if (err) {
        setError(err);
        setFile(null);
        onFileChange(null);
        return;
      }
      setError(null);
      setFile(f);
      onFileChange(f);
    },
    [onFileChange, validate]
  );

  const handleBrowseClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    applyFile(f);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    applyFile(f);
  };

  const clearFile = () => {
    applyFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          {label}
        </label>
      )}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        aria-disabled={disabled}
        tabIndex={0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        className={`min-h-[46px] w-full bg-card border rounded-xl px-3.5 py-2.5 text-xs shadow-xs flex items-center justify-between transition-all outline-none cursor-pointer ${
          dragActive
            ? "border-primary ring-1 ring-primary"
            : "border-border hover:border-primary/60"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-3">
          {file ? (
            <FileText className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <UploadCloud className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span
            className={`truncate font-medium ${
              file ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
          >
            {file
              ? `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
              : "Click to upload or drag & drop (PDF, DOC, DOCX, ZIP up to 10MB)"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {file && (
            <button
              type="button"
              className="flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              disabled={disabled}
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            type="button"
            className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 px-3 py-1 rounded-lg transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
            disabled={disabled}
          >
            Browse
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  );
};

export default FileUpload;