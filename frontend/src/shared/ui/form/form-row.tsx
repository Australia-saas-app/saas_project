"use client"

import { ReactNode } from "react"

interface FormRowProps {
  label: string
  children: ReactNode
  className?: string
}

export function FormRow({ label, children, className = "" }: FormRowProps) {
  return (
    <div className={`mb-0 ${className}`}>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  )
}

export default FormRow
