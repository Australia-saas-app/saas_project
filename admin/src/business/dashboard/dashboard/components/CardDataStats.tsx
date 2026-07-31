"use client";
import React from "react";

type CardItem = {
  name: string;
  icon?: any;
  number?: number;
  isLoading?: boolean;
};

const CardDataStats: React.FC<{ item: CardItem; index: number }> = ({
  item,
  index,
}) => {
  const Icon = item.icon || null;

  const fmt = (n?: number) => {
    if (!n && n !== 0) return "0";
    if (n >= 1000) return `${(n / 1000).toFixed(2).replace(/\.00$/, "")}K`;
    return String(n);
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 shadow-sm p-5 flex flex-col justify-between min-h-[120px]"
    >
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.name}</p>
        </div>
        {Icon ? (
          <div className="rounded-lg p-2.5 shadow-sm bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400">
            <Icon className="text-xl" />
          </div>
        ) : null}
      </div>

      <div className="mt-4 relative z-10">
        {item.isLoading ? (
          <div className="h-9 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md mt-1" />
        ) : (
          <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {fmt(item.number)}
          </p>
        )}
      </div>
    </div>
  );
};

export default CardDataStats;

