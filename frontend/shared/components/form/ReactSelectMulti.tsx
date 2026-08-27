"use client";

import React from "react";
import Select, { MultiValue, Options, StylesConfig } from "react-select";

type Option = { value: string; label: string };

interface ReactSelectMultiProps {
  value: string[];
  onChange: (values: string[]) => void;
  options: Option[];
  placeholder?: string;
  isDisabled?: boolean;
}

const customStyles: StylesConfig<Option, true> = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "var(--card, #0f172a)",
    borderColor: state.isFocused ? "var(--primary, #3b82f6)" : "var(--border, #334155)",
    boxShadow: state.isFocused ? "0 0 0 1px var(--primary, #3b82f6)" : "none",
    borderRadius: "0.75rem",
    minHeight: "42px",
    marginTop: "0.25rem",
    cursor: "pointer",
    "&:hover": {
      borderColor: state.isFocused ? "var(--primary, #3b82f6)" : "var(--border, #475569)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 8px",
    gap: "4px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--muted-foreground, #94a3b8)",
    fontSize: "0.75rem",
  }),
  input: (base) => ({
    ...base,
    color: "var(--foreground, #f8fafc)",
    fontSize: "0.75rem",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--foreground, #f8fafc)",
    fontSize: "0.75rem",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    borderRadius: "0.5rem",
    padding: "1px 4px",
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--foreground, #f8fafc)",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "2px 4px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: "0.375rem",
    cursor: "pointer",
    padding: "0 4px",
    marginLeft: "3px",
    transition: "all 0.15s ease-in-out",
    ":hover": {
      backgroundColor: "rgba(239, 68, 68, 0.35)",
      color: "#ffffff",
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "var(--card, #0f172a)",
    border: "1px solid var(--border, #334155)",
    borderRadius: "0.75rem",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    padding: "4px",
    maxHeight: "152px",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--primary, #3b82f6)"
      : state.isFocused
      ? "rgba(59, 130, 246, 0.1)"
      : "transparent",
    color: state.isSelected ? "#ffffff" : "var(--foreground, #f8fafc)",
    fontSize: "0.75rem",
    fontWeight: 500,
    borderRadius: "0.5rem",
    cursor: "pointer",
    padding: "8px 12px",
    ":active": {
      backgroundColor: "var(--primary, #3b82f6)",
      color: "#ffffff",
    },
  }),
  indicatorsContainer: (base) => ({
    ...base,
    color: "var(--muted-foreground, #94a3b8)",
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: "var(--muted-foreground, #94a3b8)",
    padding: "4px 8px",
    ":hover": {
      color: "var(--foreground, #f8fafc)",
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--muted-foreground, #94a3b8)",
    padding: "4px 8px",
    ":hover": {
      color: "#ef4444",
    },
  }),
};

const ReactSelectMulti: React.FC<ReactSelectMultiProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  isDisabled = false,
}) => {
  const selected = options.filter((o) => value?.includes(o.value));

  const handleChange = (v: MultiValue<Option>) => {
    const vals = v ? v.map((i: Option) => i.value) : [];
    onChange(vals);
  };

  return (
    <Select
      isMulti
      isDisabled={isDisabled}
      value={selected}
      onChange={handleChange}
      options={options as Options<Option>}
      placeholder={placeholder}
      classNamePrefix="react-select"
      styles={customStyles}
    />
  );
};

export default ReactSelectMulti;
