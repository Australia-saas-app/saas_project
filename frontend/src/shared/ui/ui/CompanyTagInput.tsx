"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/src/shared/ui/ui/input";

interface CompanyTagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function CompanyTagInput({
  tags,
  onTagsChange,
  placeholder = "Type company name and press Enter",
  className = ""
}: CompanyTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const sampleCompanies = [
    "Tech Solutions Inc.",
    "Global Healthcare Partners",
    "Finance Corporation",
    "EduTech Systems",
    "Manufacturing Co.",
    "Retail Ventures",
    "Consulting Group"
  ];

  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (value.trim()) {
      const filtered = sampleCompanies.filter(company =>
        company.toLowerCase().includes(value.toLowerCase()) &&
        !tags.includes(company)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const addTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag)) {
      const newTags = [...tags, tag.trim()];
      onTagsChange(newTags);
    }
    setInputValue("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-white text-slate-900 border-0"
        />
        
        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1 max-h-32 overflow-y-auto">
            {suggestions.map((company, index) => (
              <button
                key={index}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                onClick={() => addTag(company)}
              >
                {company}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
