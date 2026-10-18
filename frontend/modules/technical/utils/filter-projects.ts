import type { TechnicalProject } from "../types/project.type"
import type { TechnicalFilters } from "../constants/technical-filter.constants"

function parsePrice(priceRange: string): number {
  return Number(priceRange.replace(/[^0-9.]/g, "")) || 0
}

function skillMatches(projectSkills: string[] | undefined, selected: string[] = []): boolean {
  if (!selected || selected.length === 0) return true
  if (!projectSkills || projectSkills.length === 0) return false
  const normalized = projectSkills.map((s) => s.toLowerCase())
  return selected.every((skill) =>
    normalized.some((projectSkill) => projectSkill.includes(skill.toLowerCase()))
  )
}

function languageMatches(projectLanguages: string[] | undefined, selected: string[] = []): boolean {
  if (!selected || selected.length === 0) return true
  if (!projectLanguages || projectLanguages.length === 0) return false
  return selected.some((lang) => projectLanguages.includes(lang))
}

export function filterTechnicalProjects(
  projects: TechnicalProject[],
  filters: TechnicalFilters,
  query: string
): TechnicalProject[] {
  const q = query.trim().toLowerCase()

  return projects.filter((project) => {
    if (q) {
      const matchesQuery =
        project.title.toLowerCase().includes(q) ||
        project.category.toLowerCase().includes(q) ||
        project.description.toLowerCase().includes(q) ||
        project.skills.some((skill) => skill.toLowerCase().includes(q))
      if (!matchesQuery) return false
    }

    if (filters.projectType !== "all" && project.projectType !== filters.projectType) {
      return false
    }

    if (filters.category !== "all" && project.categoryFilter !== filters.category) {
      return false
    }

    if (filters.subcategory !== "all" && project.subcategory !== filters.subcategory) {
      return false
    }

    if (!skillMatches(project.skills, filters.skills)) {
      return false
    }

    if (!languageMatches(project.languages, filters.languages)) {
      return false
    }

    const price = project.price ?? parsePrice(project.priceRange)
    if (price < filters.minPrice || price > filters.maxPrice) {
      return false
    }

    return true
  })
}

export function countActiveFilters(filters: TechnicalFilters): number {
  let count = 0
  if (filters.projectType !== "all") count++
  if (filters.category !== "all") count++
  if (filters.subcategory !== "all") count++
  if (filters.skills.length > 0) count++
  if (filters.languages.length > 0) count++
  if (filters.minPrice > 0 || filters.maxPrice < 20000) count++
  return count
}
