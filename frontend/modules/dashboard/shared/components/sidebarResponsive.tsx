"use client";

import React from "react";

interface SidebarProps {
  isExpanded: boolean;
  isMobile: boolean;
  onCloseMobile: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}

export function SidebarResponsive({
  isExpanded,
  isMobile,
  onCloseMobile,
  onMouseEnter,
  onMouseLeave,
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
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={onCloseMobile}
            aria-hidden
          />
        )}
        <aside
          className={[
            "fixed left-0 top-0 z-40 flex h-[100dvh] min-h-0 w-64 flex-col overflow-hidden border-r border-border bg-card shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
            isExpanded ? "translate-x-0" : "-translate-x-full pointer-events-none",
          ].join(" ")}
        >
          {children}
        </aside>
      </>
    );
  }

  return (
    <div
      className={[
        "relative h-[100dvh] shrink-0 transition-[width] duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-[72px]",
      ].join(" ")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <aside
        className={[
          "flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-card transition-[width,box-shadow] duration-300 ease-in-out",
          isExpanded ? "w-64 shadow-md" : "w-[72px] shadow-xs",
        ].join(" ")}
      >
        {children}
      </aside>
    </div>
  );
}

export default SidebarResponsive;
