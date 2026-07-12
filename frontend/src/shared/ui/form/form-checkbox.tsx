"use client"

import { Checkbox } from "@/shared/ui/ui/checkbox"
import { FormControl, FormField, FormItem, FormLabel } from "./form"
import type { Control, FieldPath, ControllerRenderProps } from "react-hook-form"
import React from "react"

interface FormCheckboxProps {
  control: Control<any>
  name: FieldPath<any>
  label?: string
  className?: string
}

export function FormCheckbox({ control, name, label, className = "" }: FormCheckboxProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={(props) => {
        // FormField sometimes forwards the field directly or as { field }
        const maybe = props as unknown as { field?: ControllerRenderProps<any, FieldPath<any>> } | ControllerRenderProps<any, FieldPath<any>>
        const field: ControllerRenderProps<any, FieldPath<any>> =
          "field" in maybe && maybe.field ? maybe.field : (maybe as ControllerRenderProps<any, FieldPath<any>>)

        return (
          <FormItem className={`flex flex-row items-center space-x-2 space-y-0 ${className}`}>
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            {label && <FormLabel className="text-sm font-normal">{label}</FormLabel>}
          </FormItem>
        )
      }}
    />
  )
}

export default FormCheckbox
