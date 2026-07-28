"use client";

import { useEffect, useId } from "react";
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
  md: { maxWidth: "500px" },
  lg: { maxWidth: "600px" },
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={SIZE_STYLES[size]}
        className={[
          "relative flex max-h-[min(85vh,640px)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5",
          SIZE_CLASS[size],
          panelClassName,
        ].join(" ")}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold tracking-tight text-gray-900">
                  {title}
                </h2>
                {badge}
              </div>
              {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}
