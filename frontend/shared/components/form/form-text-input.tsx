"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/src/components/ui/input";
import { FormControl, FormField, FormItem, FormMessage } from "./form";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface FormTextInputProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  placeholder: string;
  type?: "text" | "email" | "number" | "password" | "date";
}

export function FormTextInput<T extends FieldValues>({
  control,
  name,
  placeholder,
  type = "text",
}: FormTextInputProps<T>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const currentType = isPasswordField ? (showPassword ? "text" : "password") : type;

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
                value={
                  typeof field.value === "string" || typeof field.value === "number"
                    ? field.value
                    : ""
                }
                className={`bg-white text-slate-900 placeholder:text-slate-500 border-0 ${isPasswordField ? 'pr-10' : ''}`}
              />
              {isPasswordField && (
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none flex items-center justify-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
