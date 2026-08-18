"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Grid3x3, List, Plus, SlidersHorizontal, FolderKanban, Compass } from "lucide-react";
import { SearchInput } from "@/src/components/form/search-input";
import { Button } from "@/src/components/ui/button";
import { Pagination } from "@/src/components/ui/pagination";
import { useLocale } from "@/src/shared/context/locale.provider";
import { useUser } from "@/src/context/user.provider";
import { usePermission } from "@/src/hooks/permission.hook";
import { useRequireAuth } from "@/src/shared/hooks/use-require-auth";
import { DEFAULT_TECHNICAL_FILTERS } from "../constants/technical-filter.constants";
import type { TechnicalUserRole } from "../types/project.type";
import { filterTechnicalProjects } from "../utils/filter-projects";
import TechnicalFilterSidebar from "./TechnicalFilterSidebar";
import { ProjectGridView, useTechnicalProjectModal } from "./project-grid-view";
import { ProjectListView } from "./project-list-view";
import { fetchPublicProjects } from "../services/technical.services";
import UserProjectsPage from "./UserProjectsPage";
import BusinessServicesLayout from "@/src/modules/dashboard/business/components/BusinessServicesLayout";

const PAGE_SIZE = 9;

export default function TechnicalPageLayout() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const { user } = useUser();
  const { t } = useLocale();
  const rawRole = String((user as any)?.role || (user as any)?.accountType || "").toLowerCase().trim();
  const isBusinessUser = Boolean(
    rawRole === "business" || rawRole === "seller" || rawRole === "company"
  );
  const createProjectHref = isBusinessUser
    ? "/business/technical/create"
    : "/user/technical/create";
  
  const [activeTab, setActiveTab] = useState<"explore" | "my-projects">("explore");
  const [userRole] = useState<TechnicalUserRole>("normal");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState<number>(9);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_TECHNICAL_FILTERS);

  const [liveApprovedProjects, setLiveApprovedProjects] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1024px)");
    const update = () => {
      setIsMobile(mq.matches);
      setSidebarOpen(!mq.matches);
    };
    update();
    mq.addEventListener("change", update);

    const loadData = async () => {
      try {
        const res = await fetchPublicProjects().catch(() => null);
        let projectsList: any[] = [];

        if (res && res.projects && Array.isArray(res.projects)) {
          projectsList = res.projects
            .filter((p: any) => p.submissionStatus === "active" || p.paymentStatus === "paid" || p.status === "active")
            .map((p: any) => ({
              id: p.id || p.projectId,
              projectId: p.projectId || `PRJ-${String(p.id).slice(0, 6)}`,
              title: p.title,
              category: p.category || "Software Development",
              categoryFilter: "web",
              projectType: p.projectType || "new-build",
              subcategory: p.subcategory || "fullstack",
              tech: p.subcategory || p.projectType || p.category || "Software Development",
              skills: (p.requiredSkills?.length ? p.requiredSkills : (p.skills?.length ? p.skills : ["React", "TypeScript", "Tailwind CSS"])),
              duration: p.duration ? `${p.duration} Days` : "14 Days",
              price: Number(p.adminBudget || p.price || 1500),
              priceRange: `$${Number(p.adminBudget || p.price || 1500).toLocaleString()}`,
              modified: "Active Project",
              languages: (p.preferredLanguages?.length ? p.preferredLanguages : (p.languages?.length ? p.languages : ["JavaScript", "TypeScript"])),
              location: "Remote",
              description: p.description || p.requirements || "Professional technical service.",
            }));
        } else {
          // Offline fallback only when network fails
          const userProjectsRaw = localStorage.getItem("platform_user_technical_projects");
          if (userProjectsRaw) {
            const parsedUser = JSON.parse(userProjectsRaw);
            if (Array.isArray(parsedUser)) {
              projectsList = parsedUser
                .filter((p: any) => p.submissionStatus === "active" || p.paymentStatus === "paid" || p.status === "active")
                .map((p: any) => ({
                  id: p.id || p.projectId,
                  projectId: p.projectId || `PRJ-${String(p.id).slice(0, 6)}`,
                  title: p.title,
                  category: p.category || "Software Development",
                  categoryFilter: "web",
                  projectType: p.projectType || "new-build",
                  subcategory: p.subcategory || "fullstack",
                  tech: p.subcategory || p.projectType || p.category || "Software Development",
                  skills: (p.requiredSkills?.length ? p.requiredSkills : (p.skills?.length ? p.skills : ["React", "TypeScript", "Tailwind CSS"])),
                  duration: p.duration ? `${p.duration} Days` : "14 Days",
                  price: Number(p.adminBudget || p.price || 1500),
                  priceRange: `$${Number(p.adminBudget || p.price || 1500).toLocaleString()}`,
                  modified: "Active Project",
                  languages: (p.preferredLanguages?.length ? p.preferredLanguages : (p.languages?.length ? p.languages : ["JavaScript", "TypeScript"])),
                  location: "Remote",
                  description: p.description || "Professional technical service.",
                }));
            }
          }
        }

        if (projectsList.length > 0) {
          setLiveApprovedProjects(projectsList);
          return;
        }

        // fallback to business_service_rows
        const raw = localStorage.getItem("business_service_rows");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const approved = parsed
              .filter(
                (s: any) =>
                  (s.status?.toUpperCase() === "ACTIVE" || s.status?.toUpperCase() === "COMPLETED") &&
                  (s.category === "Technical" || s.title || s.subCategory)
              )
              .map((s: any, idx: number) => ({
                id: 9000 + idx,
                title: s.title || `${s.category || "Technical"} Service (${s.id})`,
                category: s.subCategory || "Web Development",
                categoryFilter: "web",
                projectType: "new-build",
                subcategory: "fullstack",
                skills: s.skills && s.skills.length > 0 ? s.skills : ["React", "TypeScript", "Node.js"],
                duration: s.deadline || "14 Days",
                experience: "3+ Years",
                price: Number(String(s.budget).replace(/[^0-9.]/g, "")) || 1500,
                priceRange: s.budget || "$1,500.00",
                modified: "Recently Approved",
                languages: ["english"],
                location: "Remote",
                description:
                  s.summary ||
                  `Professional technical service listed by ${s.client}. Verified and approved by Admin.`,
              }));
            setLiveApprovedProjects(approved);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setDataLoaded(true);
      }
    };

    loadData();
    window.addEventListener("storage", loadData);
    window.addEventListener("focus", loadData);

    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("storage", loadData);
      window.removeEventListener("focus", loadData);
    };
  }, []);

  const allProjects = useMemo(() => {
    return dataLoaded ? liveApprovedProjects : [];
  }, [liveApprovedProjects, dataLoaded]);

  const filtered = useMemo(
    () => filterTechnicalProjects(allProjects as any, filters, query),
    [allProjects, filters, query]
  );

  const displayedProjects = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const { setSelected, modal } = useTechnicalProjectModal();

  const handleFiltersChange = (next: typeof filters) => {
    setFilters(next);
    setVisibleCount(9);
  };

  return (
    <div className="relative flex h-screen max-h-screen overflow-hidden bg-background">
      {activeTab === "explore" && isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      {activeTab === "explore" && (
        <TechnicalFilterSidebar
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          filters={filters}
          onChange={handleFiltersChange}
        />
      )}

      <div className="min-w-0 flex-1 h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 dark:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 flex flex-col">
        <div className="border-b border-border bg-card px-4 py-5 shadow-sm md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                {t.technical.eyebrow}
              </p>
              <h1 className="text-2xl font-bold text-foreground">{t.technical.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t.technical.subtitle}</p>

              {/* Tab selector between Explore and My Projects */}
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={activeTab === "explore" ? "default" : "outline"}
                  onClick={() => setActiveTab("explore")}
                  className={activeTab === "explore" ? "bg-primary text-white cursor-pointer" : "cursor-pointer"}
                >
                  <Compass className="mr-1.5 h-4 w-4" />
                  Explore Projects
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === "my-projects" ? "default" : "outline"}
                  onClick={() => {
                    if (!isAuthenticated) {
                      const loginPath = isBusinessUser ? "/account/business/login" : "/account/user/login";
                      router.push(`${loginPath}?redirect=${encodeURIComponent("/technical")}`);
                      return;
                    }
                    setActiveTab("my-projects");
                  }}
                  className={`cursor-pointer ${activeTab === "my-projects" ? "bg-primary text-white" : ""}`}
                >
                  <FolderKanban className="mr-1.5 h-4 w-4" />
                  My Projects
                </Button>
              </div>
            </div>

            {/* Top Right Controls & Create Project Button */}
            <div className="flex flex-wrap items-center gap-3">
              {activeTab === "explore" && (
                <>
                  {isMobile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSidebarOpen(true)}
                      className="w-fit lg:hidden"
                    >
                      <SlidersHorizontal className="mr-1 h-4 w-4" />
                      {t.technical.filters.title}
                    </Button>
                  )}
                  <SearchInput
                    value={query}
                    onChange={(value) => {
                      setQuery(value);
                      setVisibleCount(9);
                    }}
                    placeholder={t.technical.searchPlaceholder}
                    className="w-full sm:w-72"
                  />

                  {/* Grid / List view toggle commented out - Grid View is exclusively active
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border bg-muted/60 p-1">
                      <Button
                        variant={layout === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setLayout("grid")}
                        className={`h-8 w-8 p-0 ${layout === "grid" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                        aria-label="Grid view"
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={layout === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setLayout("list")}
                        className={`h-8 w-8 p-0 ${layout === "list" ? "bg-primary text-white hover:bg-primary/90" : ""}`}
                        aria-label="List view"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  */}
                </>
              )}

              {/* Top-Right Create Button with Auth Check */}
              <Button
                onClick={() => {
                  if (!isAuthenticated) {
                    router.push(`/account/user/login?redirect=${encodeURIComponent(createProjectHref)}`);
                    return;
                  }
                  router.push(createProjectHref);
                }}
                className="bg-primary hover:bg-primary/90 text-white font-bold shadow-md transition-all active:scale-95 px-4 py-2 cursor-pointer"
              >
                <Plus className="mr-1.5 h-4 w-4 stroke-[3]" />
                Create Project
              </Button>
            </div>
          </div>
        </div>

        {activeTab === "my-projects" ? (
          <div className="p-4 md:p-8">
            {isBusinessUser ? <BusinessServicesLayout /> : <UserProjectsPage />}
          </div>
        ) : (
          <>
            <div className="border-b border-border bg-card/80 backdrop-blur px-4 py-3 text-sm text-muted-foreground md:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {t.common.ui.showing}{" "}
                  <span className="font-semibold text-foreground">
                    {Math.min(displayedProjects.length, filtered.length)}
                  </span>{" "}
                  {t.common.ui.of}{" "}
                  <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                  {t.technical.projects}
                </span>
                <span className="text-xs text-muted-foreground/70">{t.technical.filtersInstant}</span>
              </div>
            </div>

            <div className="px-4 py-6 md:px-8 flex-1">
              {displayedProjects.length > 0 ? (
                <ProjectGridView projects={displayedProjects} onViewProject={setSelected} />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
                  <p className="text-lg font-semibold text-foreground">{t.technical.noProjects}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.technical.noProjectsHint}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setQuery("");
                      setFilters({ ...DEFAULT_TECHNICAL_FILTERS });
                      setVisibleCount(9);
                    }}
                  >
                    {t.technical.clearSearchFilters}
                  </Button>
                </div>
              )}

              {/* View More Button (Loads +9 Cards per Click) */}
              {filtered.length > visibleCount && (
                <div className="mt-10 flex flex-col items-center justify-center gap-2 pb-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((prev) => prev + 9)}
                    className="min-w-[200px] rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary hover:text-white font-bold text-primary shadow-sm transition-all duration-200 cursor-pointer py-5 text-sm"
                  >
                    View More
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Showing {displayedProjects.length} of {filtered.length} projects
                  </p>
                </div>
              )}

              {(userRole === "unauthorized" || userRole === "normal" || userRole === "affiliate") && (
                <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                  <p className="text-sm text-amber-900">
                    {t.technical.upgradePrompt}{" "}
                    <Link
                      href="/account/user/registration"
                      className="font-semibold underline underline-offset-2"
                    >
                      {t.common.ui.upgradeAccount}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {modal}
    </div>
  );
}
