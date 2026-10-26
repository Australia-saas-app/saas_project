"use client";

import React, { ReactNode } from "react";


interface TableHeadingProps {
  children: ReactNode;
  className?: string;
}

export const TableHeading: React.FC<TableHeadingProps> = ({
  children,
  className = "bg-secondary text-base-400",
}) => {
  return (
    <thead className={`sticky top-0 z-10 ${className}`}>
      <tr className="bg-blue-600 dark:bg-blue-700 border-b border-blue-700 dark:border-blue-800">{children}</tr>
    </thead>
  );
};

export default TableHeading;