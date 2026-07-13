"use client"

import { useState } from "react"
import { Eye, EyeOff, Search } from "lucide-react"

import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { FormControl, FormField, FormItem, FormMessage } from "./form"
import { Input } from "../ui/input"

interface FormInputProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  placeholder: string
  type?: "text" | "email" | "password" | "number"
  showPasswordToggle?: boolean
  showSearchIcon?: boolean
  className?: string
}

export function FormInput<T extends FieldValues>({
  control,
  name,
  placeholder,
  type = "text",
  showPasswordToggle = false,
  showSearchIcon = false,
  className = "",
}: FormInputProps<T>) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <div className="relative">
            <FormControl>
              <Input
                type={showPasswordToggle && showPassword ? "text" : type}
                placeholder={placeholder}
                {...field}
                className={`bg-white text-slate-900 placeholder:text-slate-500 border-0 ${showSearchIcon || showPasswordToggle ? 'pr-10' : ''} ${className}`}
              />
            </FormControl>
            
            {/* Search Icon */}
            {showSearchIcon && !showPasswordToggle && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="w-4 h-4" />
              </div>
            )}
            
            {/* Password Toggle Icon */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
