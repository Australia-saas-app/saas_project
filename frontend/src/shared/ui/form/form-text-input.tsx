"use client"


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
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              {...field}
              disabled={disabled}
              title={disabled ? `You cannot edit ${name} field` : undefined}
              className={`bg-white text-slate-900 disabled:cursor-not-allowed placeholder:text-slate-500 border-0 ${className}`}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
