"use client";

import { Control, FieldPath, FieldValues } from "react-hook-form";
import { FormControl, FormField, FormItem, FormMessage } from "./form";
import { SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface CustomSelectOption {
  value: string | boolean | number;
  label: string;
}

interface CustomFormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  placeholder: string;
  options: CustomSelectOption[];
  disabled?: boolean;
  showFilterIcon?: boolean;
  className?: string;
}

export function CustomFormSelect<T extends FieldValues>({
  control,
  name,
  placeholder,
  options,
  disabled = false,
  showFilterIcon = false,
  className = "",
}: CustomFormSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          <Select
            value={String(field.value ?? "")}
            onValueChange={(v) => field.onChange(v === "true" ? true : v === "false" ? false : isNaN(Number(v)) ? v : Number(v))}
          >
            <FormControl>
              <SelectTrigger
                disabled={disabled}
                className={`bg-white w-full text-slate-900 border-0 ${className}`}
              >
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
                <SelectItem key={option.label} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
