"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { X, Loader2, Plus, Search, RefreshCw } from "lucide-react";
import PageHeader from "@/src/shared/ui/ui/PageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/shared/ui/ui/select";
import { apiClient } from "@/src/infra/api/apiClient";
import { toast } from "sonner";

const LOCAL_STORAGE_TAXONOMY_KEY = "platform_service_taxonomies";

// Comprehensive coding & technical dictionary suggestions available for search
const CODING_DICTIONARY = {
  categories: [
    "Software Development",
    "Web Design & UI/UX",
    "QA & Testing",
    "Troubleshooting & Debugging",
    "Maintenance & DevOps",
    "Mobile App Development",
    "AI & Machine Learning",
    "Cybersecurity & Audits",
    "Cloud Infrastructure",
    "Data Engineering & Analytics",
    "Blockchain & Web3",
    "Game Development",
    "Embedded Systems & IoT",
    "Database Administration",
    "API Development & Integration",
    "E-Commerce Solutions",
    "CMS & Website Builders",
    "IT Support & Consulting",
  ],
  subcategories: [
    "Web Development",
    "Frontend Development",
    "Backend Development",
    "Fullstack Development",
    "Mobile App Development",
    "iOS Development",
    "Android Development",
    "Cross-Platform App (Flutter/React Native)",
    "UI/UX Design",
    "Figma Prototyping & Wireframing",
    "Design Systems & Brand Assets",
    "Website Redesign & Optimization",
    "Landing Page Design",
    "API & Microservices Architecture",
    "Database Design & Optimization",
    "DevOps & CI/CD Pipelines",
    "Cloud Architecture (AWS / GCP / Azure)",
    "Automation Testing (Cypress / Playwright / Selenium)",
    "Manual QA Testing & Test Plans",
    "Security & Vulnerability Audit",
    "Performance & Load Testing",
    "Bug Fixing & Refactoring",
    "Server Maintenance & Migration",
    "AI & Machine Learning Integration",
    "NLP & Large Language Models (LLM)",
    "Payment Gateway Integration (Stripe / PayPal)",
    "SEO & Web Performance Tuning",
    "Smart Contract Development (Solidity)",
  ],
  skills: [
    "React",
    "Next.js",
    "Vue.js",
    "Nuxt.js",
    "Angular",
    "Svelte",
    "SvelteKit",
    "Node.js",
    "Express.js",
    "NestJS",
    "TypeScript",
    "JavaScript",
    "Python",
    "Django",
    "FastAPI",
    "Flask",
    "Java",
    "Spring Boot",
    "C#",
    ".NET Core",
    "ASP.NET Core",
    "Go (Golang)",
    "Rust",
    "PHP",
    "Laravel",
    "Symfony",
    "Ruby",
    "Ruby on Rails",
    "PostgreSQL",
    "MongoDB",
    "MySQL",
    "Redis",
    "GraphQL",
    "REST APIs",
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "Google Cloud (GCP)",
    "Tailwind CSS",
    "HTML5/CSS3",
    "Bootstrap",
    "Sass / SCSS",
    "Figma",
    "Adobe XD",
    "UI/UX Designer",
    "Cypress",
    "Playwright",
    "Selenium",
    "Jest",
    "Vitest",
    "React Native",
    "Flutter",
    "Swift",
    "Kotlin",
    "Git",
    "GitHub Actions",
    "CI/CD",
    "SEO",
    "Adobe Photoshop",
    "Adobe Illustrator",
    "Kafka",
    "RabbitMQ",
    "Elasticsearch",
    "Solidity",
    "Web3.js",
    "TensorFlow",
    "PyTorch",
    "OpenAI API",
  ],
};

export default function ServiceLayout() {
  const [serviceType, setServiceType] = useState("Technology");
  const normalizedServiceKey = serviceType.toLowerCase().replace(/\s+/g, "-");

  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Suggestions state
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showSubCategorySuggestions, setShowSubCategorySuggestions] = useState(false);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  const categoryInputRef = useRef<HTMLInputElement>(null);
  const subCategoryInputRef = useRef<HTMLInputElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  // Read local taxonomy cache (starts fresh if nothing in cache)
  const readLocalTaxonomy = useCallback((sKey: string) => {
    if (typeof window === "undefined") return { categories: [], subcategories: [], skills: [] };
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TAXONOMY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed[sKey]) {
          return {
            categories: Array.isArray(parsed[sKey].categories) ? parsed[sKey].categories : [],
            subcategories: Array.isArray(parsed[sKey].subcategories) ? parsed[sKey].subcategories : [],
            skills: Array.isArray(parsed[sKey].skills) ? parsed[sKey].skills : [],
          };
        }
      }
    } catch {}
    return { categories: [], subcategories: [], skills: [] };
  }, []);

  // Write local taxonomy cache and broadcast to frontend
  const writeLocalTaxonomy = useCallback(
    (sKey: string, catList: string[], subList: string[], skillList: string[]) => {
      if (typeof window === "undefined") return;
      try {
        let store: any = {};
        const raw = localStorage.getItem(LOCAL_STORAGE_TAXONOMY_KEY);
        if (raw) store = JSON.parse(raw) || {};
        store[sKey] = {
          categories: catList,
          subcategories: subList,
          skills: skillList,
        };
        localStorage.setItem(LOCAL_STORAGE_TAXONOMY_KEY, JSON.stringify(store));
        window.dispatchEvent(new Event("platform_taxonomy_updated"));
        window.dispatchEvent(new Event("storage"));

        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("vero_channel");
          bc.postMessage({
            type: "TAXONOMY_UPDATED",
            payload: { serviceType: sKey, categories: catList, subcategories: subList, skills: skillList },
          });
          bc.close();
        }
      } catch {}
    },
    []
  );

  // Load from DB
  const loadTaxonomy = useCallback(
    async (sKey: string, silent = false) => {
      if (!silent) setLoading(true);
      else setIsRefreshing(true);

      const localData = readLocalTaxonomy(sKey);
      setCategories(localData.categories);
      setSubcategories(localData.subcategories);
      setSkills(localData.skills);

      try {
        let res: any = null;
        try {
          res = await apiClient.get<any>(`/technology/projects/taxonomy?serviceType=${sKey}`, {
            skipErrorToast: true,
          });
        } catch {
          try {
            res = await apiClient.get<any>(`/technology/services/taxonomy?serviceType=${sKey}`, {
              skipErrorToast: true,
            });
          } catch {
            res = await apiClient.get<any>(`/technology/taxonomy?serviceType=${sKey}`, {
              skipErrorToast: true,
            });
          }
        }

        const data = res?.data?.data || res?.data || res;
        if (data && (Array.isArray(data.categories) || Array.isArray(data.subcategories) || Array.isArray(data.skills))) {
          const remoteCats: string[] = Array.isArray(data.categories) ? data.categories : [];
          const remoteSubs: string[] = Array.isArray(data.subcategories) ? data.subcategories : [];
          const remoteSkills: string[] = Array.isArray(data.skills) ? data.skills : [];

          setCategories(remoteCats);
          setSubcategories(remoteSubs);
          setSkills(remoteSkills);
          writeLocalTaxonomy(sKey, remoteCats, remoteSubs, remoteSkills);
        }
      } catch {
        // use local cache
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [readLocalTaxonomy, writeLocalTaxonomy]
  );

  useEffect(() => {
    loadTaxonomy(normalizedServiceKey);
  }, [loadTaxonomy, normalizedServiceKey]);

  // ADD CATEGORY (Click or Input)
  const addCategory = async (catName?: string) => {
    const nameToAdd = (catName || newCategory).trim();
    if (!nameToAdd) return;
    if (categories.includes(nameToAdd)) {
      toast.info(`Category "${nameToAdd}" is already added.`);
      setNewCategory("");
      setShowCategorySuggestions(false);
      return;
    }

    const updated = [nameToAdd, ...categories];
    setCategories(updated);
    setNewCategory("");
    setShowCategorySuggestions(false);
    writeLocalTaxonomy(normalizedServiceKey, updated, subcategories, skills);
    toast.success(`Added Category: "${nameToAdd}"`);

    try {
      await apiClient.post(`/technology/projects/taxonomy/add`, {
        serviceType: normalizedServiceKey,
        type: "category",
        name: nameToAdd,
      });
    } catch {
      try {
        await apiClient.post(`/technology/services/taxonomy/add`, {
          serviceType: normalizedServiceKey,
          type: "category",
          name: nameToAdd,
        });
      } catch {}
    }
  };

  // REMOVE CATEGORY
  const removeCategory = async (nameToRemove: string) => {
    const updated = categories.filter((c) => c !== nameToRemove);
    setCategories(updated);
    writeLocalTaxonomy(normalizedServiceKey, updated, subcategories, skills);
    toast.success(`Removed Category: "${nameToRemove}"`);

    try {
      await apiClient.post(`/technology/projects/taxonomy/remove`, {
        serviceType: normalizedServiceKey,
        type: "category",
        name: nameToRemove,
      });
    } catch {
      try {
        await apiClient.post(`/technology/services/taxonomy/remove`, {
          serviceType: normalizedServiceKey,
          type: "category",
          name: nameToRemove,
        });
      } catch {}
    }
  };

  // ADD SUBCATEGORY (Click or Input)
  const addSubCategory = async (subName?: string) => {
    const nameToAdd = (subName || newSubCategory).trim();
    if (!nameToAdd) return;
    if (subcategories.includes(nameToAdd)) {
      toast.info(`Subcategory "${nameToAdd}" is already added.`);
      setNewSubCategory("");
      setShowSubCategorySuggestions(false);
      return;
    }

    const updated = [nameToAdd, ...subcategories];
    setSubcategories(updated);
    setNewSubCategory("");
    setShowSubCategorySuggestions(false);
    writeLocalTaxonomy(normalizedServiceKey, categories, updated, skills);
    toast.success(`Added Subcategory: "${nameToAdd}"`);

    try {
      await apiClient.post(`/technology/projects/taxonomy/add`, {
        serviceType: normalizedServiceKey,
        type: "subcategory",
        name: nameToAdd,
      });
    } catch {
      try {
        await apiClient.post(`/technology/services/taxonomy/add`, {
          serviceType: normalizedServiceKey,
          type: "subcategory",
          name: nameToAdd,
        });
      } catch {}
    }
  };

  // REMOVE SUBCATEGORY
  const removeSubCategory = async (nameToRemove: string) => {
    const updated = subcategories.filter((s) => s !== nameToRemove);
    setSubcategories(updated);
    writeLocalTaxonomy(normalizedServiceKey, categories, updated, skills);
    toast.success(`Removed Subcategory: "${nameToRemove}"`);

    try {
      await apiClient.post(`/technology/projects/taxonomy/remove`, {
        serviceType: normalizedServiceKey,
        type: "subcategory",
        name: nameToRemove,
      });
    } catch {
      try {
        await apiClient.post(`/technology/services/taxonomy/remove`, {
          serviceType: normalizedServiceKey,
          type: "subcategory",
          name: nameToRemove,
        });
      } catch {}
    }
  };

  // ADD SKILL (Click or Input)
  const addSkill = async (skillName?: string) => {
    const nameToAdd = (skillName || newSkill).trim();
    if (!nameToAdd) return;
    if (skills.includes(nameToAdd)) {
      toast.info(`Skill "${nameToAdd}" is already added.`);
      setNewSkill("");
      setShowSkillSuggestions(false);
      return;
    }

    const updated = [...skills, nameToAdd];
    setSkills(updated);
    setNewSkill("");
    setShowSkillSuggestions(false);
    writeLocalTaxonomy(normalizedServiceKey, categories, subcategories, updated);
    toast.success(`Added Skill: "${nameToAdd}"`);

    try {
      await apiClient.post(`/technology/projects/taxonomy/add`, {
        serviceType: normalizedServiceKey,
        type: "skill",
        name: nameToAdd,
      });
    } catch {
      try {
        await apiClient.post(`/technology/services/taxonomy/add`, {
          serviceType: normalizedServiceKey,
          type: "skill",
          name: nameToAdd,
        });
      } catch {}
    }
  };

  // REMOVE SKILL
  const removeSkill = async (nameToRemove: string) => {
    const updated = skills.filter((s) => s !== nameToRemove);
    setSkills(updated);
    writeLocalTaxonomy(normalizedServiceKey, categories, subcategories, updated);
    toast.success(`Removed Skill: "${nameToRemove}"`);

    try {
      await apiClient.post(`/technology/projects/taxonomy/remove`, {
        serviceType: normalizedServiceKey,
        type: "skill",
        name: nameToRemove,
      });
    } catch {
      try {
        await apiClient.post(`/technology/services/taxonomy/remove`, {
          serviceType: normalizedServiceKey,
          type: "skill",
          name: nameToRemove,
        });
      } catch {}
    }
  };

  // Filtered suggestions for autocomplete dropdown based on search query / letter
  const categorySuggestions = useMemo(() => {
    const q = newCategory.trim().toLowerCase();
    if (!q) return [];
    return CODING_DICTIONARY.categories.filter((c) => c.toLowerCase().includes(q) && !categories.includes(c));
  }, [newCategory, categories]);

  const subCategorySuggestions = useMemo(() => {
    const q = newSubCategory.trim().toLowerCase();
    if (!q) return [];
    return CODING_DICTIONARY.subcategories.filter((s) => s.toLowerCase().includes(q) && !subcategories.includes(s));
  }, [newSubCategory, subcategories]);

  const skillSuggestions = useMemo(() => {
    const q = newSkill.trim().toLowerCase();
    if (!q) return [];
    return CODING_DICTIONARY.skills.filter((s) => s.toLowerCase().includes(q) && !skills.includes(s));
  }, [newSkill, skills]);

  // Filtered displayed items based on current search input
  const displayedCategories = useMemo(() => {
    const q = newCategory.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, newCategory]);

  const displayedSubCategories = useMemo(() => {
    const q = newSubCategory.trim().toLowerCase();
    if (!q) return subcategories;
    return subcategories.filter((s) => s.toLowerCase().includes(q));
  }, [subcategories, newSubCategory]);

  const displayedSkills = useMemo(() => {
    const q = newSkill.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter((s) => s.toLowerCase().includes(q));
  }, [skills, newSkill]);

  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-hidden min-h-[70vh]">
      <div className="flex flex-col gap-6 w-full bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PageHeader title="Service" />
            <button
              onClick={() => loadTaxonomy(normalizedServiceKey, true)}
              title="Refresh database taxonomy"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-500 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          <div className="w-full md:w-64">
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm w-full">
                <SelectValue placeholder="Select Service" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-[100]">
                <SelectItem value="Technology" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">
                  Technology
                </SelectItem>
                <SelectItem value="Real Estate" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">
                  Real Estate
                </SelectItem>
                <SelectItem value="Business" className="focus:bg-blue-600 focus:text-white cursor-pointer rounded-sm mx-1 my-0.5">
                  Business
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Three-column layout matching exact UI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-4">
          {/* Categories Panel */}
          <fieldset className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-visible bg-white dark:bg-slate-900 flex flex-col h-fit relative">
            <legend className="mx-4 px-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              Category
            </legend>
            <div className="flex items-center gap-2 p-3 border-b border-slate-300 dark:border-slate-700 relative">
              <input
                ref={categoryInputRef}
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => {
                  if (newCategory.trim()) setShowCategorySuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                placeholder="Search"
              />
              <button
                type="button"
                onClick={() => addCategory()}
                className="px-4 py-2 font-bold text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm cursor-pointer shrink-0"
              >
                Add
              </button>

              {/* Suggestions dropdown on search - exactly 5 items visible, then scrolls */}
              {showCategorySuggestions && categorySuggestions.length > 0 && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-3 right-16 top-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-[190px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60"
                >
                  {categorySuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addCategory(item)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate mr-2">{item}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ul className="flex flex-col max-h-[400px] overflow-auto rounded-b-xl">
              {displayedCategories.length === 0 ? (
                <li className="p-4 text-center text-xs text-slate-400">
                  {categories.length === 0 ? "No category added yet." : "No matching category."}
                </li>
              ) : (
                displayedCategories.map((c) => (
                  <li
                    key={c}
                    className="group flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 last:border-b-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {c}
                    </span>
                    <button
                      type="button"
                      title={`Remove "${c}"`}
                      onClick={() => removeCategory(c)}
                      className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </fieldset>

          {/* SubCategories Panel */}
          <fieldset className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-visible bg-white dark:bg-slate-900 flex flex-col h-fit relative">
            <legend className="mx-4 px-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              Subcategory
            </legend>
            <div className="flex items-center gap-2 p-3 border-b border-slate-300 dark:border-slate-700 relative">
              <input
                ref={subCategoryInputRef}
                value={newSubCategory}
                onChange={(e) => {
                  setNewSubCategory(e.target.value);
                  setShowSubCategorySuggestions(true);
                }}
                onFocus={() => {
                  if (newSubCategory.trim()) setShowSubCategorySuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubCategory();
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                placeholder="Search"
              />
              <button
                type="button"
                onClick={() => addSubCategory()}
                className="px-4 py-2 font-bold text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm cursor-pointer shrink-0"
              >
                Add
              </button>

              {/* Suggestions dropdown on search - exactly 5 items visible, then scrolls */}
              {showSubCategorySuggestions && subCategorySuggestions.length > 0 && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-3 right-16 top-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-[190px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60"
                >
                  {subCategorySuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addSubCategory(item)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate mr-2">{item}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <ul className="flex flex-col max-h-[400px] overflow-auto rounded-b-xl">
              {displayedSubCategories.length === 0 ? (
                <li className="p-4 text-center text-xs text-slate-400">
                  {subcategories.length === 0 ? "No subcategory added yet." : "No matching subcategory."}
                </li>
              ) : (
                displayedSubCategories.map((s) => (
                  <li
                    key={s}
                    className="group flex justify-between items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 last:border-b-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                      {s}
                    </span>
                    <button
                      type="button"
                      title={`Remove "${s}"`}
                      onClick={() => removeSubCategory(s)}
                      className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </fieldset>

          {/* Skills Panel */}
          <fieldset className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-visible bg-white dark:bg-slate-900 flex flex-col h-fit min-h-[150px] relative">
            <legend className="mx-4 px-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              Skills
            </legend>
            <div className="flex items-center gap-2 p-3 border-b border-slate-300 dark:border-slate-700 relative">
              <input
                ref={skillInputRef}
                value={newSkill}
                onChange={(e) => {
                  setNewSkill(e.target.value);
                  setShowSkillSuggestions(true);
                }}
                onFocus={() => {
                  if (newSkill.trim()) setShowSkillSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                placeholder="Search skills"
              />
              <button
                type="button"
                onClick={() => addSkill()}
                className="px-4 py-2 font-bold text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm cursor-pointer shrink-0"
              >
                Add
              </button>

              {/* Suggestions dropdown on search - exactly 5 items visible, then scrolls */}
              {showSkillSuggestions && skillSuggestions.length > 0 && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-3 right-16 top-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 max-h-[190px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60"
                >
                  {skillSuggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addSkill(item)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate mr-2">{item}</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded shrink-0">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5 p-4 max-h-[400px] overflow-auto content-start">
              {displayedSkills.length === 0 ? (
                <div className="w-full text-center text-xs text-slate-400 py-4">
                  {skills.length === 0 ? "No skill added yet." : "No matching skill."}
                </div>
              ) : (
                displayedSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-xs group"
                  >
                    {skill}
                    <button
                      type="button"
                      title={`Remove skill "${skill}"`}
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-500 transition-colors ml-1 p-0.5 rounded-full hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}