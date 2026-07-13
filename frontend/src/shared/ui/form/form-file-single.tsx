"use client"

import React, { useState } from "react"
import { FormControl, FormField, FormItem, FormMessage } from "./form"
import FileUpload from "./FileUpload"
import { uploadFile } from "@/src/utils/uploadFile"


interface Props {
  // Accept any control to avoid cross-package/resolver type incompatibilities
  control: any
  // Use string for name to keep flexible; FormField will accept string paths
  name: string
  accept?: string
  maxSizeMB?: number
  label?: string
  disabled?: boolean
  showPreview?: boolean
}

export function FormFileUploadSingle({
  control,
  name,
  accept,
  maxSizeMB,
  label = "",
  disabled = false,
  showPreview = true,
}: Props) {
  const [uploading, setUploading] = useState(false)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">{label}</div>
              <FileUpload
                onFileChange={async (file) => {
                  if (!file) return field.onChange("")
                  try {
                    setUploading(true)
                    const url = await uploadFile(file)
                    if (url) field.onChange(url)
                  } finally {
                    setUploading(false)
                  }
                }}
                accept={accept}
                maxSizeMB={maxSizeMB}
                disabled={disabled || uploading}
              />

              {showPreview && field.value ? (
                <div className="flex items-center justify-between gap-4">
                  <a href={String(field.value)} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">
                    {String(field.value)}
                  </a>
                  <button
                    type="button"
                    className="text-sm text-destructive underline"
                    onClick={() => field.onChange("")}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default FormFileUploadSingle
