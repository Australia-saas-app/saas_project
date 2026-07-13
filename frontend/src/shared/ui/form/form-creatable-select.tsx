"use client"

import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { Input } from "../ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { FormControl, FormField, FormItem, FormMessage } from "./form"

interface CreatableSelectOption {
  value: string
  label: string
}

interface FormCreatableSelectProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  placeholder: string
  options: CreatableSelectOption[]
  disabled?: boolean
  className?: string
}

export function FormCreatableSelect<T extends FieldValues>({
  control,
  name,
  placeholder,
  options,
  disabled = false,
  className = "",
}: FormCreatableSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const currentValue = String(field.value ?? "")
        const filteredOptions = options.filter((option, index, arr) => {
          const value = option.value?.trim()
          if (!value) return false
          return arr.findIndex((item) => item.value === option.value) === index
        })
        const selectedFromOptions = filteredOptions.some((option) => option.value === currentValue)

        return (
          <FormItem className="w-full space-y-2">
            <Select
              disabled={disabled}
              value={selectedFromOptions ? currentValue : undefined}
              onValueChange={(v) => field.onChange(v)}
            >
              <FormControl>
                <SelectTrigger className={`bg-white w-full text-slate-900 border-0 ${className}`}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>

              <SelectContent>
                {filteredOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <FormControl>
              <Input
                value={currentValue}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder="Or type a new category"
                disabled={disabled}
                autoComplete="off"
                className={`bg-white text-slate-900 disabled:cursor-not-allowed placeholder:text-slate-500 border-0 ${className}`}
              />
            </FormControl>

            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
