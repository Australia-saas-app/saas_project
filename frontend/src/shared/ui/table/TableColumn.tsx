"use client";

import React, { ReactNode } from "react";

interface TableColumnProps {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  isHeader?: boolean;
  title?: string;
  colSpan?: number;
}

export const TableColumn: React.FC<TableColumnProps> = ({
  children,
  align = "left",
  className = "",
  isHeader = false,
  title = "",
  colSpan,
}) => {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

  const baseClass = isHeader
    ? `px-4 py-3 ${alignClass} text-sm font-semibold text-white tracking-wide whitespace-nowrap`
    : `px-4 py-3 ${alignClass} text-sm text-gray-600 dark:text-gray-400`;

  if (isHeader) {
    return <th className={`${baseClass} ${className}`} colSpan={colSpan}>{children}</th>;
  }

  return <td className={`${baseClass} ${className} text-nowrap`} colSpan={colSpan}>
   {
    title ? ( <div title={title} className='max-w-[190px] truncate whitespace-nowrap'>
      {children}
    </div>) : children
   }
  </td>;
};

export default TableColumn;
