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
      <dl className="space-y-2.5">
        {fields.map((field) => (
          <div key={field.label} className="rounded-lg border border-border bg-muted/40 dark:bg-muted/20 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{field.label}</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground break-words">{field.value}</dd>
          </div>
        ))}
      </dl>
      {footer && <div className="mt-5 border-t border-border pt-4">{footer}</div>}
    </AppModal>
  )
}
