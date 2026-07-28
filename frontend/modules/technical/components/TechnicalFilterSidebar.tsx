"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronDown, Play, SlidersHorizontal } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  CATEGORY_OPTIONS,
  DEFAULT_TECHNICAL_FILTERS,
  LANGUAGE_OPTIONS,
  MAX_BUDGET,
  PROJECT_TYPE_OPTIONS,
  SKILL_OPTIONS,
  SUBCATEGORY_OPTIONS,
  type TechnicalFilters,
} from "../constants/technical-filter.constants";
import { useLocale } from "@/src/shared/context/locale.provider";
import { countActiveFilters } from "../utils/filter-projects";

interface TechnicalFilterSidebarProps {
  isOpen: boolean;
  isMobile?: boolean;
  onToggle: () => void;
  filters: TechnicalFilters;
  onChange: (filters: TechnicalFilters) => void;
}

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold text-foreground marker:content-none">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground/70 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

export default function TechnicalFilterSidebar({
  isOpen,
  isMobile = false,
  onToggle,
  filters,
  onChange,
}: TechnicalFilterSidebarProps) {
  const { t } = useLocale();
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  const projectTypeOptions = useMemo(
    () =>
      PROJECT_TYPE_OPTIONS.map((option) => ({
        ...option,
        label: option.value === "all" ? t.technical.filters.allTypes : option.label,
      })),
    [t]
  );

  const categoryOptions = useMemo(
    () =>
      CATEGORY_OPTIONS.map((option) => ({
        ...option,
        label: option.value === "all" ? t.technical.filters.allCategories : option.label,
      })),
    [t]
  );

  const subcategoryOptions = useMemo(
    () =>
      SUBCATEGORY_OPTIONS.map((option) => ({
        ...option,
        label: option.value === "all" ? t.technical.filters.allSubcategories : option.label,
      })),
    [t]
  );

  const update = (patch: Partial<TechnicalFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const toggleSkill = (skill: string) => {
    const skills = filters.skills.includes(skill)
      ? filters.skills.filter((item) => item !== skill)
      : [...filters.skills, skill];
    update({ skills });
  };

  const toggleLanguage = (language: string) => {
    const languages = filters.languages.includes(language)
      ? filters.languages.filter((item) => item !== language)
      : [...filters.languages, language];
    update({ languages });
  };

  const clearFilters = () => onChange({ ...DEFAULT_TECHNICAL_FILTERS });

  return (
    <aside
      className={`${isOpen ? "w-72" : "w-12"} ${
        isMobile && isOpen ? "fixed left-0 top-0 z-40 h-screen" : "relative"
      } flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out shrink-0`}
    >
      <div className="flex items-center justify-end border-b border-border p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? "Collapse filters" : "Expand filters"}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <Play
            className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2f8] text-primary">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{t.technical.filters.title}</h2>
                  <p className="text-xs text-muted-foreground">{t.technical.filters.subtitle}</p>
                </div>
              </div>
              {activeCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs font-semibold text-primary hover:underline"
            >
              {t.technical.filters.clearAll}
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <FilterSection title={t.technical.filters.projectType}>
              <Select
                value={filters.projectType}
                onValueChange={(value) => update({ projectType: value })}
              >
                <SelectTrigger className="h-10 w-full border-border bg-background text-sm focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={t.technical.filters.projectType} />
                </SelectTrigger>
                <SelectContent>
                  {projectTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title={t.technical.filters.category}>
              <Select
                value={filters.category}
                onValueChange={(value) => update({ category: value })}
              >
                <SelectTrigger className="h-10 w-full border-border bg-background text-sm focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={t.technical.filters.category} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title={t.technical.filters.subcategory}>
              <Select
                value={filters.subcategory}
                onValueChange={(value) => update({ subcategory: value })}
              >
                <SelectTrigger className="h-10 w-full border-border bg-background text-sm focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={t.technical.filters.subcategory} />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterSection>

            <FilterSection title={t.technical.filters.skills}>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {SKILL_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      checked={filters.skills.includes(option.value)}
                      onChange={() => toggleSkill(option.value)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title={t.technical.filters.languages}>
              <div className="space-y-2">
                {LANGUAGE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-muted/60"
                  >
                    <input
                      type="checkbox"
                      checked={filters.languages.includes(option.value)}
                      onChange={() => toggleLanguage(option.value)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection title={t.technical.filters.priceBudget} defaultOpen>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={MAX_BUDGET}
                  value={filters.minPrice}
                  onChange={(e) =>
                    update({ minPrice: Math.min(Number(e.target.value) || 0, filters.maxPrice) })
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder={t.technical.filters.min}
                />
                <span className="text-xs text-muted-foreground/70">to</span>
                <input
                  type="number"
                  min={0}
                  max={MAX_BUDGET}
                  value={filters.maxPrice}
                  onChange={(e) =>
                    update({ maxPrice: Math.max(Number(e.target.value) || 0, filters.minPrice) })
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder={t.technical.filters.max}
                />
              </div>
              <input
                type="range"
                min={0}
                max={MAX_BUDGET}
                step={500}
                value={filters.maxPrice}
                onChange={(e) => update({ maxPrice: Number(e.target.value) })}
                className="mt-3 w-full accent-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t.technical.filters.upTo} ${filters.maxPrice.toLocaleString()} USD
              </p>
            </FilterSection>
          </div>

          <div className="border-t border-border p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full border-border"
              onClick={clearFilters}
            >
              {t.technical.filters.reset}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-start justify-center pt-4">
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
      )}
    </aside>
  );
}
