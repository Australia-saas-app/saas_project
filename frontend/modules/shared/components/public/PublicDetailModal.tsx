"use client"

import AppModal from "@/src/modules/dashboard/shared/components/AppModal"

export interface DetailField {
  label: string
  value: string
}

interface PublicDetailModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  fields: DetailField[]
  footer?: React.ReactNode
}

export function PublicDetailModal({
  open,
  onClose,
  title,
  subtitle,
  fields,
  footer,
}: PublicDetailModalProps) {
  return (
    <AppModal open={open} onClose={onClose} title={title} description={subtitle} size="sm">
      <dl className="space-y-3">
        {fields.map((field) => (
          <div key={field.label} className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{field.label}</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{field.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-6 border-t border-gray-100 pt-4">{footer}</div>}
    </AppModal>
  )
}
