"use client";

import React, { useRef, KeyboardEvent, ClipboardEvent } from "react";
import { Input } from "@/src/components/ui/input";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled = false }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = e.target.value.replace(/\D/g, "");
    if (!newValue) return;

    const chars = newValue.split("");
    let updatedValue = value.padEnd(length, "").split("");
    
    // Replace the current box with the last typed character
    updatedValue[index] = chars[chars.length - 1];
    
    const finalString = updatedValue.join("").substring(0, length);
    onChange(finalString);

    // Auto-focus next
    if (index < length - 1 && updatedValue[index] !== " ") {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      let updatedValue = value.padEnd(length, " ").split("");
      
      // If there is a value at this index, clear it.
      if (updatedValue[index] !== " ") {
        updatedValue[index] = " ";
        onChange(updatedValue.join("").trimEnd());
      } else if (index > 0) {
        // If empty, move back and clear the previous one.
        updatedValue[index - 1] = " ";
        onChange(updatedValue.join("").trimEnd());
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const nextFocusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextFocusIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3 w-full max-w-[360px] mx-auto">
      {Array.from({ length }).map((_, index) => {
        const char = value[index] || "";
        return (
          <Input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={char !== " " ? char : ""}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`w-10 h-12 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold rounded-xl 
              bg-background border-2 border-border/50 shadow-sm
              focus:border-primary focus:ring-4 focus:ring-primary/20 
              transition-all duration-200 
              dark:bg-card dark:text-foreground
              disabled:opacity-50 disabled:bg-muted`}
          />
        );
      })}
    </div>
  );
}
