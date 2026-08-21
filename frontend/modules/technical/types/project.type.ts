export type TechnicalUserRole = "unauthorized" | "normal" | "affiliate" | "business"

export interface TechnicalProject {
  id: string | number
  projectId?: string
  title: string
  category: string
  categoryFilter?: string
  projectType?: string
  subcategory?: string
  tech?: string
  skills: string[]
  requiredSkills?: string[]
  languages?: string[]
  preferredLanguages?: string[]
  duration?: string
  experience?: string
  priceRange: string
  price: number
  description: string
  modified?: string
  location?: string
  assignedBusinessId?: string
  assignedBusinessUserId?: string
  assignedBusinessName?: string
  assignedBusinessEmail?: string
  assignedProposalId?: string
  submissionStatus?: string
  status?: string
}
