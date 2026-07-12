"use client"

import { Textarea } from "@/src/shared/ui/ui/textarea"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "./form" // Added FormLabel
import type { Control, FieldPath } from "react-hook-form"
import React from "react"

interface FormTextAreaProps {
  control: Control<any>
  name: FieldPath<any>
  label?: string // Added label prop
  placeholder?: string
  className?: string
}

// ✅ Changed name to FormTextArea (Capital A) to match your imports
export function FormTextArea({ control, name, label, placeholder = "", className = "" }: FormTextAreaProps) {
  return (
    <FormField control={control} name={name} render={({ field }) => (
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>} 
        <FormControl>
          <Textarea placeholder={placeholder} {...field} className={className} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  )
}

export default FormTextArea
