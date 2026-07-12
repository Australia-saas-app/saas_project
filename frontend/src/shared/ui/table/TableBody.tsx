"use client";

import React, { ReactNode } from "react";

interface TableBodyProps {
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
  colSpan?: number;
}

export const TableBody: React.FC<TableBodyProps> = ({
  children,
  emptyMessage = "No data available",
  isEmpty = false,
  colSpan = 1,
}) => {
  if (isEmpty) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={colSpan}
            className="px-4 md:px-6 text-nowrap py-6 md:py-8 text-center text-gray-500 text-xs md:text-sm"
          >
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return <tbody>{children}</tbody>;
};

export default TableBody;
