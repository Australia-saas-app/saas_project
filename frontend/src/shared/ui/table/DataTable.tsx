"use client";

import { cn } from "@/infra/lib/utils";
import React from "react";


export type DataColumn<T> = {
  header: React.ReactNode;
  accessor?: keyof T | string;
  width?: string;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataColumn<T>[];
  rowKey?: (row: T, index: number) => string;
  className?: string;
  empty?: React.ReactNode;
  compact?: boolean;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowKey,
  className,
  empty,
  compact = false,
}: DataTableProps<T>) {
  const getKey = (row: T, idx: number) => {
    if (rowKey) return rowKey(row, idx);
    if ((row as any).id) return String((row as any).id);
    return `${idx}`;
  };

  if (!data || data.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        {empty ?? <div className="text-center py-4 text-sm text-muted-foreground">No data</div>}
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-hidden rounded-2xl border border-white/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg", className)}>
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className={cn(
          "w-full border-collapse min-w-[600px]",
          compact ? "text-[11px]" : "text-sm"
        )}>
          <thead className="bg-gradient-to-r from-primary/90 to-primary text-white border-b border-primary/20">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    "p-4 font-semibold text-left align-middle tracking-wider uppercase text-xs",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-300 divide-y divide-gray-100 dark:divide-gray-800">
            {data.map((row, rIdx) => (
              <tr 
                key={getKey(row, rIdx)} 
                className="hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors duration-200 group"
              >
                {columns.map((col, cIdx) => {
                  const cell =
                    col.render !== undefined
                      ? col.render(row, rIdx)
                      : col.accessor
                      ? String((row as any)[col.accessor])
                      : null;
                  return (
                    <td 
                      key={cIdx} 
                      className={cn(
                          "p-4 align-middle group-hover:text-primary transition-colors",
                          col.className
                        )}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
