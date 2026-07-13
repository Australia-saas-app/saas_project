"use client"

import { useState } from "react"
import { FormControl, FormField, FormItem, FormMessage } from "./form"
import FileUpload from "./FileUpload"
import { uploadFile } from "@/src/shared/utils/uploadFile"

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
  // when true (default) the component uploads the file immediately via uploadFile
  // and stores the returned URL in the form field. When false the raw File is set
  // on the form field so parent can append it to FormData as a file.
  uploadImmediately?: boolean
}

export function UploadFile({
  control,
  name,
  accept,
  maxSizeMB,
  label = "",
  disabled = false,
  uploadImmediately = true,
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
                  // If no file selected, reset the field
                  if (!file) return field.onChange("")

                  // If caller wants immediate upload, upload and store returned URL
                  if (uploadImmediately) {
                    try {
                      setUploading(true)
                      const url = await uploadFile(file)
                      if (url) field.onChange(url)
                      else field.onChange("")
                    } finally {
                      setUploading(false)
                    }
                  } else {
                    // Keep raw File in the form so parent can include it as a file
                    field.onChange(file)
                  }
                }}
                accept={accept}
                maxSizeMB={maxSizeMB}
                disabled={disabled || uploading}
              />

              {/* {showPreview && field.value ? (
                <div className="flex items-center justify-between gap-4">
                  {typeof field.value === "string" ? (
                    <a href={String(field.value)} target="_blank" rel="noreferrer" className="text-sm text-primary underline truncate">
                      {String(field.value)}
                    </a>
                  ) : (
                    <span className="text-sm text-foreground truncate">{(field.value as File)?.name ?? "Selected file"}</span>
                  )}

                  <button
                    type="button"
                    className="text-sm text-destructive underline"
                    onClick={() => field.onChange("")}
                  >
                    Remove
                  </button>
                </div>
              ) : null} */}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}


