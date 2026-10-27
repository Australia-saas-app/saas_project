"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Archive, Trash2, Loader2 } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "neutral";

interface ConfirmActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  itemName?: string;
}

const VARIANT_STYLES: Record<
  ConfirmVariant,
  { icon: typeof Trash2; iconBg: string; iconColor: string; button: string }
> = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/10 dark:bg-red-500/20",
    iconColor: "text-red-600 dark:text-red-400",
    button: "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white",
  },
  warning: {
    icon: Archive,
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-400",
    button: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white",
  },
  neutral: {
    icon: AlertTriangle,
    iconBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-600 dark:text-blue-400",
    button: "bg-primary hover:bg-primary/90 active:bg-primary/80 text-white",
  },
};

export default function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  itemName,
}: ConfirmActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 overflow-y-auto">
      <div
        style={{ width: "380px", maxWidth: "calc(100vw - 32px)" }}
        className="bg-card rounded-2xl shadow-2xl p-7 text-center mx-auto border border-border animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Centered Circular Icon */}
        <div className={`w-14 h-14 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}>
          <Icon className={`w-6 h-6 ${styles.iconColor}`} strokeWidth={1.8} />
        </div>

        {/* Centered Title */}
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>

        {/* Centered Description */}
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>

        {/* Item Name pill if present */}
        {itemName && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs font-semibold text-foreground mb-4 truncate text-center">
            {itemName}
          </div>
        )}

        {/* Warning note for danger action */}
        {variant === "danger" && (
          <p className="text-xs text-red-500/90 font-medium mb-6">
            This action cannot be undone.
          </p>
        )}

        {/* Centered Side-by-Side Action Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 bg-muted hover:bg-muted/80 rounded-xl font-semibold text-foreground text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer ${styles.button}`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
