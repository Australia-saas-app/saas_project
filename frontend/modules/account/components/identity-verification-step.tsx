"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Check } from "lucide-react"
import FileUpload from "@/src/components/form/FileUpload"
import { OnboardingStepFrame } from "./onboarding-step-frame"

interface IdentityVerificationStepProps {
  onNext: (data: Record<string, unknown>) => void
  onBack: () => void
  initialData?: Record<string, unknown>
  accountType: string
  isLastStep: boolean
  showBack?: boolean
}

export function IdentityVerificationStep({
  onNext,
  onBack,
  initialData = {},
  showBack = true,
}: IdentityVerificationStepProps) {
  const [facePhoto, setFacePhoto] = useState<string | null>(
    typeof initialData.facePhoto === "string" ? initialData.facePhoto : null
  )
  const [idFront, setIdFront] = useState<string | null>(
    typeof initialData.idFront === "string" ? initialData.idFront : null
  )
  const [idBack, setIdBack] = useState<string | null>(
    typeof initialData.idBack === "string" ? initialData.idBack : null
  )

  const handleSubmit = () => {
    if (facePhoto && idFront && idBack) {
      onNext({ facePhoto, idFront, idBack })
    }
  }

  const canSubmit = Boolean(facePhoto && idFront && idBack)

  return (
    <OnboardingStepFrame
      title="Identity verification"
      description="Upload a clear face photo and both sides of your government-issued ID."
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-800">Face photo</h4>
          <p className="mb-3 text-xs text-gray-500">
            Position your face in the frame with good lighting and no obstructions.
          </p>
          <FileUpload
            accept="image/*"
            onFileChange={(file) => {
              if (!file) return setFacePhoto(null)
              const reader = new FileReader()
              reader.onloadend = async () => {
                let result = reader.result as string
                try {
                  const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
                  result = await compressImageFile(file, 1200, 1200, 0.85);
                } catch (e) {}
                setFacePhoto(result)
              }
              reader.readAsDataURL(file)
            }}
          />
          {facePhoto && (
            <img src={facePhoto} alt="Face preview" className="mt-3 h-40 w-full rounded-lg object-cover" />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-800">ID documents</h4>
            <p className="mb-3 text-xs text-gray-500">
              Upload passport, national ID, or driver license — front and back.
            </p>
          </div>

          <FileUpload
            accept="image/*"
            onFileChange={(file) => {
              if (!file) return setIdFront(null)
              const reader = new FileReader()
              reader.onloadend = async () => {
                let result = reader.result as string
                try {
                  const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
                  result = await compressImageFile(file, 1200, 1200, 0.85);
                } catch (e) {}
                setIdFront(result)
              }
              reader.readAsDataURL(file)
            }}
          />
          {idFront && (
            <img src={idFront} alt="ID front" className="h-28 w-full rounded-lg object-cover" />
          )}

          <FileUpload
            accept="image/*"
            onFileChange={(file) => {
              if (!file) return setIdBack(null)
              const reader = new FileReader()
              reader.onloadend = async () => {
                let result = reader.result as string
                try {
                  const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
                  result = await compressImageFile(file, 1200, 1200, 0.85);
                } catch (e) {}
                setIdBack(result)
              }
              reader.readAsDataURL(file)
            }}
          />
          {idBack && (
            <img src={idBack} alt="ID back" className="h-28 w-full rounded-lg object-cover" />
          )}

          {canSubmit && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Check className="h-4 w-4" />
              <span>All documents uploaded</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        {showBack && (
          <Button type="button" variant="outline" onClick={onBack} className="flex-1 bg-transparent">
            Back
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit} className="flex-1">
          Complete verification
        </Button>
      </div>
    </OnboardingStepFrame>
  )
}
