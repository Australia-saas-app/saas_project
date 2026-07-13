"use client";

import React from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder,
  className = "",
}) => {
  return (
    <div className={`relative ${className} group`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-5 pr-12 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm placeholder:text-slate-400"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-600 text-white shadow-sm group-focus-within:bg-blue-700 transition-all">
        <Search className="w-4 h-4" />
      </div>
    </div>
  );
};
