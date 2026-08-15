"use client";

import React from "react";

interface SidebarProps {
  isExpanded?: boolean;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: React.ReactNode;
}

export function SidebarResponsive({
  isExpanded = true,
  isMobile = false,
  onCloseMobile,
  children,
}: SidebarProps) {
  React.useEffect(() => {
    if (isMobile && isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isExpanded]);

  if (isMobile) {
    return (
      <>
        {isExpanded && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden"
            onClick={onCloseMobile}
            aria-hidden
          />
        )}
        <aside
          className={[
            "fixed left-0 top-0 z-40 flex h-[100dvh] min-h-0 w-[260px] flex-col overflow-hidden border-r border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
            isExpanded ? "translate-x-0" : "-translate-x-full pointer-events-none",
          ].join(" ")}
        >
          {children}
        </aside>
      </>
    );
  }

  // Fixed opened desktop sidebar at standard full width (w-[260px]) matching Affiliate and Business sidebars
  return (
    <aside className="relative flex h-[100dvh] w-[260px] shrink-0 flex-col overflow-hidden border-r border-border bg-card shadow-xs">
      {children}
    </aside>
  );
}

export default SidebarResponsive;
