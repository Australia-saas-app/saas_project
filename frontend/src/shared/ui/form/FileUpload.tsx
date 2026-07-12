import React, { useCallback, useRef, useState } from "react";


type FileUploadProps = {
    onFileChange: (file: File | null) => void;
    name?: string;
    accept?: string;
    maxSizeMB?: number; // client-side max size check
    disabled?: boolean;
    className?: string;
    label?: string;
};

// Note: Compact variant doesn't show size; add helper back if needed for preview variant.

const FileUpload: React.FC<FileUploadProps> = ({
    onFileChange,
    name,
    accept = "image/*,application/pdf",
    maxSizeMB = 10,
    disabled = false,
    className = "",
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const validate = useCallback(
        (f: File) => {
            if (!f) return "No file selected";
            if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
                return `File too large. Max ${maxSizeMB}MB allowed.`;
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

    const clearFile = () => applyFile(null);

    return (
        <div className={`w-full ${className}`}>

            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`h-11 w-full bg-white text-slate-900 placeholder:text-slate-500 border-0 pr-10 min-w-0 rounded-md  dark:bg-input/30 px-3 text-sm shadow-xs flex items-center justify-between transition-[color,box-shadow] outline-none 
                ${dragActive ? "border-ring" : "border-input hover:border-secondary"} 
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
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
            >
                <div className="flex items-center gap-2 min-w-0">
                    {/* Icon */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4 text-gray-400 shrink-0"
                        aria-hidden="true"
                    >
                        <path d="M7.5 13.5l4.5-4.5 4.5 4.5m-4.5-4.5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        <path d="M3 16.5v-9A1.5 1.5 0 014.5 6h15A1.5 1.5 0 0121 7.5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    <span className={`truncate ${file ? "text-foreground" : "text-muted-foreground"}`}>
                        {file ? file.name : "Select or drop a file"}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {file && (
                        <button type="button" className="text-xs text-destructive hover:underline" onClick={(e) => { e.stopPropagation(); clearFile(); }} disabled={disabled}>
                            Clear
                        </button>
                    )}
                    <button type="button" className="text-xs text-secondary hover:underline" onClick={(e) => { e.stopPropagation(); handleBrowseClick(); }} disabled={disabled}>
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

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default FileUpload;
