"use client"

import React, { useState } from "react"
import { FormControl, FormField, FormItem, FormMessage } from "./form"
import { uploadFiles } from "@/src/utils/uploadFile"


interface Props {
  control: any
  name: string
  accept?: string
  label?: string
  disabled?: boolean
}

export function FormFileUploadMultiple({
  control,
  name,
  accept,
  label = "Upload files",
  disabled = false,
}: Props) {
  const [uploading, setUploading] = useState(false)

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const files: string[] = Array.isArray(field.value) ? field.value : []

        return (
          <FormItem>
            <FormControl>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-700">{label}</div>
                  <input
                    type="file"
                    multiple
                    accept={accept}
                    disabled={disabled || uploading}
                    onChange={async (e) => {
                      const list = Array.from(e.target.files ?? [])
                      if (list.length === 0) return
                      setUploading(true)
                      try {
                        // use batch endpoint when available
                        const urls = await uploadFiles(list)
                        field.onChange([...files, ...urls])
                        // clear input
                        e.currentTarget.value = ""
                      } finally {
                        setUploading(false)
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  {files.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No files uploaded</div>
                  ) : (
                    files.map((u, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <a href={u} target="_blank" rel="noreferrer" className="text-sm underline text-primary truncate">
                          {u}
                        </a>
                        <button
                          type="button"
                          className="text-sm text-destructive underline"
                          onClick={() => field.onChange(files.filter((x) => x !== u))}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export default FormFileUploadMultiple
