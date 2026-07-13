"use client"


import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { Input } from "../ui/input"
import { FormControl, FormField, FormItem, FormMessage } from "./form"

interface FormTextInputProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  placeholder: string
  type?: "text" | "email" | "number" | "password" | "url" | "date"
  disabled?: boolean
  className?: string
}


export function FormTextInput<T extends FieldValues>({
  control,
  name,
  placeholder,
  type = "text",
  disabled = false,
  className
}: FormTextInputProps<T>) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === "password"
  const currentType = isPassword ? (showPassword ? "text" : "password") : type

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="relative">
              <Input
                type={currentType}
                placeholder={placeholder}
                {...field}
                disabled={disabled}
                title={disabled ? `You cannot edit ${name} field` : undefined}
                className={`bg-white text-slate-900 disabled:cursor-not-allowed placeholder:text-slate-500 border-0 ${className} ${isPassword ? "pr-10" : ""}`}
              />
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
