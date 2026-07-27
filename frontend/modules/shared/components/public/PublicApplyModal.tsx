"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import AppModal from "@/src/modules/dashboard/shared/components/AppModal"
import { Button } from "@/src/components/ui/button"
import { useRequireAuth } from "@/src/shared/hooks/use-require-auth"
import {
  hasApplied,
  submitApplication,
  type ApplicationType,
} from "@/src/shared/lib/application-store"
import { toast } from "sonner"

export interface PublicApplyModalProps {
  open: boolean
  onClose: () => void
  type: ApplicationType
  itemId: string
  itemTitle: string
  title?: string
  description?: string
}

function getUserIdentity(user: NonNullable<ReturnType<typeof useRequireAuth>["user"]>) {
  const id = "id" in user && user.id ? String(user.id) : "email" in user && user.email ? user.email : "guest"
  const email = "email" in user && user.email ? user.email : ""
  const name =
    "firstName" in user && user.firstName
      ? `${user.firstName} ${"lastName" in user && user.lastName ? user.lastName : ""}`.trim()
      : "name" in user && user.name
        ? user.name
        : email || "Applicant"
  return { id, email, name }
}

export function PublicApplyModal({
  open,
  onClose,
  type,
  itemId,
  itemTitle,
  title = "Submit application",
  description = "Tell us why you are a good fit. Our team will review your application and follow up by email.",
}: PublicApplyModalProps) {
  const { user, isLoading, isAuthenticated, loginUrl } = useRequireAuth()
  const [coverLetter, setCoverLetter] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)

  useEffect(() => {
    if (!open || !user) {
      setAlreadyApplied(false)
      return
    }
    const { id } = getUserIdentity(user)
    setAlreadyApplied(hasApplied(id, type, itemId))
  }, [open, user, type, itemId])

  useEffect(() => {
    if (!open) {
      setCoverLetter("")
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!coverLetter.trim()) {
      toast.error("Please add a short cover letter.")
      return
    }
    const { id, email } = getUserIdentity(user)
    if (hasApplied(id, type, itemId)) {
      toast.info("You have already applied to this listing.")
      return
    }

    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 500))
    submitApplication({
      type,
      itemId,
      itemTitle,
      coverLetter: coverLetter.trim(),
      userId: id,
      userEmail: email,
    })
    setSubmitting(false)
    toast.success("Application submitted. Track it under Dashboard → Applications.")
    onClose()
  }

  return (
    <AppModal open={open} onClose={onClose} title={title} description={description} size="sm">
      {isLoading ? (
        <p className="text-sm text-gray-500">Checking your session…</p>
      ) : !isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sign in to apply for <span className="font-semibold text-gray-900">{itemTitle}</span>.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href={loginUrl}>Sign in to apply</Link>
            </Button>
          </div>
        </div>
      ) : alreadyApplied ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You have already applied to <span className="font-semibold text-gray-900">{itemTitle}</span>. We will contact you by email with updates.
          </p>
          <div className="flex justify-end">
            <Button type="button" onClick={onClose} className="bg-primary hover:bg-primary/90">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Applying as</label>
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
              {getUserIdentity(user!).name}
              {getUserIdentity(user!).email ? ` · ${getUserIdentity(user!).email}` : ""}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Cover letter</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Briefly describe your experience and why you are interested in this opportunity."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          </div>
        </form>
      )}
    </AppModal>
  )
}
