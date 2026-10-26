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
      <div className="overflow-x-auto overflow-y-auto max-h-[620px] w-full custom-scrollbar">
        <table
          style={{ tableLayout: 'fixed' }}
          className="w-full text-left border-collapse min-w-[850px]"
        >
          {children}
        </table>
      </div>
    </div>
  );
};

export default Table;