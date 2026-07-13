"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { FormControl, FormField, FormItem, FormMessage } from "./form"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { SlidersHorizontal } from "lucide-react"

interface SelectOption {
  value: string 
  label: string
}

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  placeholder: string
  options: SelectOption[]
  disabled?: boolean
  showFilterIcon?: boolean
  className?: string
}

export function FormSelect<T extends FieldValues>({ 
  control, 
  name, 
  placeholder, 
  options, 
  disabled = false,
  showFilterIcon = false,
  className = "",
}: FormSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          {/* Use a controlled Select so react-hook-form stays in sync. */}
          <Select value={String(field.value ?? "")} onValueChange={(v) => field.onChange(v)}>
            <FormControl>
              <SelectTrigger disabled={disabled} className={`bg-white w-full text-slate-900 border-0 ${className}`}>
                <div className="flex items-center justify-between w-full">
                  <SelectValue placeholder={placeholder} />
                  {showFilterIcon && (
                    <SlidersHorizontal className="h-4 w-4 text-primary ml-2" />
                  )}
                </div>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.label} className="" value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
