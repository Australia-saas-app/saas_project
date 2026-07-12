"use client";

import React from "react";
import { Button } from "@/src/shared/ui/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: number; // How many page numbers to show
  className?: string;
  pageSize?: number;
  totalResults?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = 5,
  className = "",
  pageSize = 10,
  totalResults,
}) => {
  // Calculate which page numbers to show
  const getPageNumbers = () => {
    const pages: number[] = [];
    let startPage = Math.max(1, currentPage - Math.floor(showPageNumbers / 2));
    const endPage = Math.min(totalPages, startPage + showPageNumbers - 1);

    // Adjust start if we're near the end
    if (endPage - startPage + 1 < showPageNumbers) {
      startPage = Math.max(1, endPage - showPageNumbers + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Calculate start and end item numbers for the summary
  const startResult = (currentPage - 1) * pageSize + 1;
  const endResult = totalResults !== undefined ? Math.min(totalResults, currentPage * pageSize) : Math.min(totalPages * pageSize, currentPage * pageSize);

  return (
    <div className={`flex flex-col md:flex-row justify-between items-center gap-4 md:gap-2 w-full ${className}`}>
      {typeof totalResults === "number" && (
        <div className="text-sm text-slate-500 font-medium text-center md:text-left w-full md:w-auto">{
          `Showing ${startResult} to ${endResult} of ${totalResults} results`
        }</div>
      )}

      <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 w-full md:w-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200 disabled:cursor-not-allowed shadow-sm"
        >
          PREV
        </Button>
        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={
              currentPage === page
                ? "bg-blue-600 text-white border-none shadow-sm font-bold cursor-pointer hover:bg-blue-700 transition-all"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
            }
          >
            {page}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200 disabled:cursor-not-allowed shadow-sm"
        >
          NEXT
        </Button>
      </div>
    </div>
  );
};
