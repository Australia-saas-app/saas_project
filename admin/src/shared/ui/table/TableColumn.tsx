"use client";

import React, { ReactNode, CSSProperties } from "react";

interface TableColumnProps {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  isHeader?: boolean;
  title?: string;
  colSpan?: number;
  width?: string;       // Tailwind class e.g. "w-14"
  style?: CSSProperties; // inline style e.g. { width: '30%' }
}

export const TableColumn: React.FC<TableColumnProps> = ({
  children,
  align = "left",
  className = "",
  isHeader = false,
  title = "",
  colSpan,
  width = "",
  style,
}) => {
  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

  // Column divider: visible right border on every cell except the last
  const dividerClass = "border-r border-slate-200 dark:border-slate-700 last:border-r-0";

  const baseClass = isHeader
    ? `px-3.5 py-3 ${alignClass} text-xs font-semibold text-white tracking-wide whitespace-nowrap overflow-hidden ${dividerClass} ${width}`
    : `px-3.5 py-3 ${alignClass} text-sm text-gray-700 dark:text-gray-300 break-words ${dividerClass} ${width}`;

  if (isHeader) {
    return (
      <th className={`${baseClass} ${className}`} colSpan={colSpan} style={style}>
        {children}
      </th>
    );
  }

  return (
    <td className={`${baseClass} ${className}`} colSpan={colSpan} style={style}>
      {title ? (
        <div title={title} className="truncate">
          {children}
        </div>
      ) : children}
    </td>
  );
};

export default TableColumn;