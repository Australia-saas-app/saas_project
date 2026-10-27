"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type AppModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASS: Record<AppModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const SIZE_STYLES: Record<AppModalSize, React.CSSProperties> = {
  sm: { maxWidth: "420px" },
  md: { maxWidth: "520px" },
  lg: { maxWidth: "640px" },
  xl: { maxWidth: "800px" },
};

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: AppModalSize;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  panelClassName?: string;
}

export default function AppModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  icon,
  badge,
  panelClassName = "",
}: AppModalProps) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 sm:p-6 overflow-y-auto"
      role="presentation"
    >
      <div
        className="fixed inset-0 -z-10"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={SIZE_STYLES[size]}
        className={[
          "relative flex max-h-[min(90vh,720px)] w-full flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-foreground",
          SIZE_CLASS[size],
          panelClassName,
        ].join(" ")}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-foreground">
                  {title}
                </h2>
                {badge}
              </div>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-foreground">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-muted/30 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
}
