"use client";

import React, { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
  headerClassName?: string;
}

export const Table: React.FC<TableProps> = ({
  children,
  className = "",
  headerClassName = "bg-secondary text-base-400",
}) => {
  return (
    <div
      className={`w-full bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table
          className="w-full min-w-[800px] text-left border-collapse"
        >
          {children}
        </table>
      </div>
    </div>
  );
};

export default Table;
