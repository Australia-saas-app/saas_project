"use client"

import React from "react"
import dynamic from "next/dynamic"
import { FormControl, FormField, FormItem, FormMessage } from "./form"
import type { ComponentType } from "react"

interface Option {
  label: string
  value: string
}

interface FormMultiSelectProps {
  control: any
  name: string
  options: Option[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function FormMultiSelect({
  control,
  name,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
}: FormMultiSelectProps) {

  type RSProps = {
    isMulti?: boolean
    options: Option[]
    value?: Option[] | null
    placeholder?: string
    isDisabled?: boolean
    onChange?: (v: unknown) => void
    classNamePrefix?: string
  }

  const ReactSelect = dynamic(() => import("react-select"), { ssr: false }) as unknown as ComponentType<RSProps>

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // field.value is expected to be string[] | undefined
        const valueArray: string[] = Array.isArray(field.value) ? field.value : (field.value ? [String(field.value)] : [])

        // Map keys for react-select when available
        const selectedOptions = options.filter((o) => valueArray.includes(o.value))

        return (
          <FormItem className={`w-full ${className}`}>
            <FormControl>
              {/* Try to render react-select if present, otherwise fallback */}
              {ReactSelect ? (
                <ReactSelect
                  isMulti
                  options={options}
                  value={selectedOptions}
                  placeholder={placeholder}
                  isDisabled={disabled}
                  onChange={(selected: unknown) => {
                    // react-select passes either an array of options or null
                    if (!selected) {
                      field.onChange([])
                      return
                    }
                    // selected can be array of { value, label }
                    const arr = Array.isArray(selected) ? (selected as Array<{ value: string }>).map((s) => s.value) : []
                    field.onChange(arr)
                  }}
                  // small styles to better match app UI, keep minimal
                  classNamePrefix="react-select"
                />
              ) : (
                // Fallback: checkbox list
                <div className="flex flex-col gap-2">
                  {options.map((opt) => {
                    const checked = valueArray.includes(opt.value)
                    return (
                      <label key={opt.value} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={disabled}
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(valueArray)
                            if (e.target.checked) next.add(opt.value)
                            else next.delete(opt.value)
                            field.onChange(Array.from(next))
                          }}
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export default FormMultiSelect
