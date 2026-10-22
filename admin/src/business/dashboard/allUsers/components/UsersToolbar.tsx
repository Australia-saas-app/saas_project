"use client"

import React from "react"
import { SearchInput } from "@/src/shared/ui/form/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/ui/ui/select"

interface Props {
  query: string
  onQueryChange: (v: string) => void
  currency: string
  onCurrencyChange: (v: string) => void
  status: string
  onStatusChange: (v: string) => void
  startDate: string
  onStartDateChange: (v: string) => void
  endDate: string
  onEndDateChange: (v: string) => void
}

const UsersToolbar: React.FC<Props> = ({ 
  query, onQueryChange, 
  currency, onCurrencyChange, 
  status, onStatusChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange
}) => {
  return (
    <>
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm w-full">
      <div className="w-full xl:w-80 flex-shrink-0">
        <SearchInput 
          value={query} 
          onChange={onQueryChange} 
          placeholder="Search users by name or email..." 
          className="w-full"
        />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto xl:ml-auto">
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-full sm:w-[160px] data-[state=open]:ring-2 data-[state=open]:ring-blue-500/50 flex-shrink-0">
            <SelectValue placeholder="All Currencies" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100]">
            <SelectItem value="All Currencies" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Currencies</SelectItem>
            <SelectItem value="USD" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">USD</SelectItem>
            <SelectItem value="JPY" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">JPY</SelectItem>
            <SelectItem value="EUR" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">EUR</SelectItem>
            <SelectItem value="GBP" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">GBP</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-full sm:w-auto min-w-[140px]"
          />
          <span className="text-slate-400 font-medium hidden sm:block">-</span>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-full sm:w-auto min-w-[140px]"
          />
        </div>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-full sm:w-[160px] data-[state=open]:ring-2 data-[state=open]:ring-blue-500/50 flex-shrink-0">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100]">
            <SelectItem value="All Statuses" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">All Statuses</SelectItem>
            <SelectItem value="ACTIVE" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Active</SelectItem>
            <SelectItem value="PENDING" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Pending</SelectItem>
            <SelectItem value="UNDER_REVIEW" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Under Review</SelectItem>
            <SelectItem value="SUSPENDED" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Suspended</SelectItem>
            <SelectItem value="BLOCKED" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Blocked</SelectItem>
            <SelectItem value="DORMANT" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Dormant</SelectItem>
            <SelectItem value="DEACTIVATED" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Deactivated</SelectItem>
            <SelectItem value="CLOSED" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    </>
  )
}

export default UsersToolbar
