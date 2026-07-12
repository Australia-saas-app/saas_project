"use client";

import React from "react";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  /** Right-side content (e.g. search input) */
  right?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title = "Notice Board",
  right,
  className = "",
}) => {
  return (
    <div className={`flex flex-col  md:flex-row md:items-center md:justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h1>
        {/* {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>} */}
      </div>

      {right && <div className="">{right}</div>}
    </div>
  );
};

export default PageHeader;
