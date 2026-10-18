export type SearchCategory =
  | "products"
  | "services"
  | "businesses"
  | "jobs"
  | "courses"
  | "people"
  | "companies"
  | "articles"
  | "travel"
  | "real-estate"
  | "finance"
  | "actions"
  | "ai"

export type SearchResultItem = {
  id: string
  title: string
  description: string
  href: string
  category: SearchCategory
  keywords: string[]
  badge?: string
}

export const SEARCH_CATEGORY_LABELS: Record<SearchCategory, string> = {
  products: "Products",
  services: "Services",
  businesses: "Businesses",
  jobs: "Jobs",
  courses: "Courses",
  people: "People",
  companies: "Companies",
  articles: "Articles",
  travel: "Travel",
  "real-estate": "Real Estate",
  finance: "Finance",
  actions: "Quick Actions",
  ai: "AI Answer",
}

export const SEARCH_CATEGORY_ORDER: SearchCategory[] = [
  "ai",
  "products",
  "services",
  "businesses",
  "companies",
  "jobs",
  "courses",
  "travel",
  "real-estate",
  "finance",
  "people",
  "articles",
  "actions",
]

/** Demo / static universal index — expand when APIs are wired */
export const UNIVERSAL_SEARCH_INDEX: SearchResultItem[] = [
  // Products / marketplace
  {
    id: "p-dell",
    title: "Dell Latitude Laptop",
    description: "Business laptop available in Marketplace",
    href: "/marketplace",
    category: "products",
    keywords: ["laptop", "dell", "computer", "electronics", "macbook"],
    badge: "Marketplace",
  },
  {
    id: "p-macbook",
    title: "MacBook Pro",
    description: "Apple MacBook listings and accessories",
    href: "/marketplace",
    category: "products",
    keywords: ["laptop", "macbook", "apple", "computer", "electronics"],
    badge: "Marketplace",
  },
  {
    id: "p-electronics",
    title: "Electronics & Gadgets",
    description: "Browse electronics on the marketplace",
    href: "/marketplace",
    category: "products",
    keywords: ["electronics", "gadgets", "phone", "tablet", "products"],
  },
  // Services
  {
    id: "s-laptop-repair",
    title: "Laptop Repair",
    description: "Professional laptop and device repair services",
    href: "/technical",
    category: "services",
    keywords: ["laptop", "repair", "technical", "computer", "fix"],
  },
  {
    id: "s-lawyer",
    title: "Legal & Lawyer Services",
    description: "Find lawyers and legal consultants",
    href: "/associate",
    category: "services",
    keywords: ["lawyer", "legal", "attorney", "law", "consultant"],
  },
  {
    id: "s-dentist",
    title: "Dentists & Healthcare",
    description: "Healthcare professionals near you",
    href: "/service/healthcare",
    category: "services",
    keywords: ["dentist", "doctor", "healthcare", "medical", "clinic"],
  },
  {
    id: "s-construction",
    title: "Construction Services",
    description: "Construction projects and contractors",
    href: "/service/construction",
    category: "services",
    keywords: ["construction", "builder", "contractor", "renovation"],
  },
  {
    id: "s-technical",
    title: "Technical Projects",
    description: "Software, IT, and technical services",
    href: "/technical",
    category: "services",
    keywords: ["software", "developer", "engineer", "ai", "technology", "it"],
  },
  // Businesses / companies
  {
    id: "b-dell-kenya",
    title: "Dell Kenya",
    description: "Official Dell partner business listing",
    href: "/associate",
    category: "businesses",
    keywords: ["dell", "kenya", "computer", "laptop", "business"],
  },
  {
    id: "b-computer-world",
    title: "Computer World",
    description: "Electronics and computer retailer",
    href: "/associate",
    category: "businesses",
    keywords: ["computer", "laptop", "electronics", "store"],
  },
  {
    id: "c-associates",
    title: "Business Associates",
    description: "Browse partner companies and associates",
    href: "/associate",
    category: "companies",
    keywords: ["company", "business", "crm", "partner", "register company"],
  },
  // Jobs
  {
    id: "j-careers",
    title: "Browse Jobs & Careers",
    description: "Open positions across industries",
    href: "/careers",
    category: "jobs",
    keywords: ["job", "career", "hiring", "employment", "vacancy"],
  },
  {
    id: "j-software",
    title: "Software Engineer Roles",
    description: "Find software engineering jobs",
    href: "/careers",
    category: "jobs",
    keywords: ["software", "engineer", "developer", "programmer", "job"],
    badge: "Hiring",
  },
  {
    id: "j-dubai",
    title: "Jobs in Dubai",
    description: "Career opportunities related to Dubai / Gulf",
    href: "/careers",
    category: "jobs",
    keywords: ["dubai", "uae", "gulf", "job", "overseas"],
  },
  // Courses
  {
    id: "co-courses",
    title: "All Courses",
    description: "Browse learning courses and certifications",
    href: "/courses",
    category: "courses",
    keywords: ["course", "learn", "education", "training", "certification"],
  },
  {
    id: "co-laptop-repair",
    title: "Laptop Repair Course",
    description: "Learn professional laptop repair skills",
    href: "/courses",
    category: "courses",
    keywords: ["laptop", "repair", "course", "training", "electronics"],
  },
  {
    id: "co-create",
    title: "Create a Course",
    description: "Publish your own training course",
    href: "/courses/create",
    category: "courses",
    keywords: ["create course", "teach", "instructor"],
  },
  // Travel
  {
    id: "t-flights",
    title: "Flights & Travel",
    description: "Visa and travel services including flights",
    href: "/visa-travel",
    category: "travel",
    keywords: ["flight", "airline", "dubai", "travel", "cheap flight", "trip"],
  },
  {
    id: "t-hotels",
    title: "Hotels",
    description: "Hotel and accommodation travel options",
    href: "/visa-travel",
    category: "travel",
    keywords: ["hotel", "stay", "accommodation", "dubai", "travel"],
  },
  {
    id: "t-visa",
    title: "Visa Processing",
    description: "Apply for visas and travel documents",
    href: "/visa",
    category: "travel",
    keywords: ["visa", "dubai", "passport", "immigration", "travel"],
  },
  {
    id: "t-transport",
    title: "Transport & Logistics",
    description: "Transport services and logistics",
    href: "/transport",
    category: "travel",
    keywords: ["transport", "logistics", "shipping", "delivery", "vehicle"],
  },
  // Real estate
  {
    id: "re-listings",
    title: "Real Estate Listings",
    description: "Properties for sale and rent",
    href: "/real-estate",
    category: "real-estate",
    keywords: ["real estate", "property", "house", "apartment", "dubai", "land"],
  },
  // Finance
  {
    id: "f-wallet",
    title: "Wallet & Payments",
    description: "Manage wallet, deposits, and payouts",
    href: "/user/wallet",
    category: "finance",
    keywords: ["wallet", "payment", "money", "payout", "finance", "banking"],
  },
  {
    id: "f-banking",
    title: "Online Banking Info",
    description: "Online banking service information",
    href: "/online-banking",
    category: "finance",
    keywords: ["banking", "finance", "payment", "investment"],
  },
  {
    id: "f-investment",
    title: "Investment Services",
    description: "Investment opportunities and guidance",
    href: "/service/investment",
    category: "finance",
    keywords: ["investment", "finance", "portfolio", "stocks"],
  },
  // People / team
  {
    id: "pe-team",
    title: "Our Team",
    description: "Meet people on the System DB team",
    href: "/our-teams",
    category: "people",
    keywords: ["people", "team", "staff", "member", "profile"],
  },
  // Articles
  {
    id: "a-blogs",
    title: "Blog & Articles",
    description: "News, guides, and platform articles",
    href: "/blogs",
    category: "articles",
    keywords: ["article", "blog", "news", "guide", "laptop", "lawyer", "legal"],
  },
  {
    id: "a-notice",
    title: "Notice Board",
    description: "Official notices and announcements",
    href: "/notice",
    category: "articles",
    keywords: ["notice", "announcement", "news"],
  },
  {
    id: "a-privacy",
    title: "Privacy Policy",
    description: "How we handle your data",
    href: "/privacy",
    category: "articles",
    keywords: ["privacy", "policy", "legal", "terms"],
  },
  {
    id: "a-company-reg",
    title: "How to Register a Company",
    description: "Support article and business onboarding paths",
    href: "/contact",
    category: "articles",
    keywords: ["register company", "business registration", "company", "how do i"],
  },
  // Actions / modules
  {
    id: "x-gallery",
    title: "Gallery",
    description: "Media gallery and highlights",
    href: "/gallery",
    category: "actions",
    keywords: ["gallery", "photos", "media"],
  },
  {
    id: "x-branches",
    title: "Global Branches",
    description: "Find office locations worldwide",
    href: "/branch",
    category: "actions",
    keywords: ["branch", "office", "location", "near me"],
  },
  {
    id: "x-contact",
    title: "Contact Support",
    description: "Get help from our support team",
    href: "/contact",
    category: "actions",
    keywords: ["support", "help", "contact", "ticket"],
  },
  {
    id: "x-sitemap",
    title: "Sitemap",
    description: "Browse all platform sections",
    href: "/sitemap",
    category: "actions",
    keywords: ["sitemap", "all services", "menu"],
  },
  {
    id: "x-login",
    title: "Login / Register",
    description: "Access your account or create one",
    href: "/account/user/login",
    category: "actions",
    keywords: ["login", "register", "sign up", "account"],
  },
]

export type GroupedSearchResults = Partial<Record<SearchCategory, SearchResultItem[]>>

export type UniversalSearchResponse = {
  query: string
  groups: GroupedSearchResults
  flat: SearchResultItem[]
  aiAnswer: string | null
  total: number
}

function normalize(q: string) {
  return q.trim().toLowerCase().replace(/\s+/g, " ")
}

function scoreItem(item: SearchResultItem, q: string): number {
  if (!q) return 0
  const title = item.title.toLowerCase()
  const desc = item.description.toLowerCase()
  const keys = item.keywords.map((k) => k.toLowerCase())
  let score = 0
  if (title === q) score += 100
  if (title.startsWith(q)) score += 60
  if (title.includes(q)) score += 40
  if (desc.includes(q)) score += 15
  for (const k of keys) {
    if (k === q) score += 50
    else if (k.startsWith(q)) score += 30
    else if (k.includes(q) || q.includes(k)) score += 20
  }
  // Multi-word: require at least one token hit
  const tokens = q.split(" ").filter(Boolean)
  if (tokens.length > 1) {
    const hit = tokens.filter(
      (t) => title.includes(t) || desc.includes(t) || keys.some((k) => k.includes(t))
    ).length
    score += hit * 12
  }
  return score
}

export function buildAiAnswer(query: string, flat: SearchResultItem[]): string | null {
  const q = normalize(query)
  if (q.length < 3) return null

  if (/flight|dubai|hotel|visa|travel/.test(q)) {
    return `Based on “${query}”, I found travel-related options including flights, hotels, and visa services. Open Travel results below, or go to Visa & Travel to continue.`
  }
  if (/lawyer|legal|attorney|law/.test(q)) {
    return `Looking for legal help? Browse lawyer and consultant listings under Associates, plus related articles. You can also contact support if you need guidance.`
  }
  if (/laptop|macbook|computer|electronics/.test(q)) {
    return `I found products, businesses, repair services, and courses related to “${query}”. Start with Marketplace for products or Technical for repair services.`
  }
  if (/job|engineer|developer|hiring|career/.test(q)) {
    return `I can help you find roles. Check Careers for openings matching “${query}”, and Courses if you want to upskill first.`
  }
  if (/dentist|doctor|healthcare|clinic|near me/.test(q)) {
    return `For healthcare needs like “${query}”, open Healthcare services and Global Branches to find nearby options.`
  }
  if (/register company|company registration|start a business/.test(q)) {
    return `To register or grow a business on System DB, review Associates / Business paths and Contact Support for onboarding help.`
  }
  if (/cheap|under \$|budget/.test(q) && /laptop|flight/.test(q)) {
    return `For budget-minded searches like “${query}”, filter Marketplace or Travel listings and compare options in the categories below.`
  }
  if (flat.length === 0) {
    return `I couldn’t find a direct match for “${query}”. Try a broader term, browse All Services, or ask support.`
  }
  if (flat.length >= 3 || q.split(" ").length >= 4) {
    const top = flat.slice(0, 3).map((r) => r.title).join(", ")
    return `Here’s what I found for “${query}”. Top matches include ${top}. Results are grouped by type below so you don’t need to know which module they belong to.`
  }
  return null
}

export function universalSearch(query: string, limitPerCategory = 5): UniversalSearchResponse {
  const q = normalize(query)
  if (!q) {
    return { query: "", groups: {}, flat: [], aiAnswer: null, total: 0 }
  }

  // Include dynamic technical projects when available in browser
  let currentIndex = UNIVERSAL_SEARCH_INDEX;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("platform_user_technical_projects");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const dynamicItems: SearchResultItem[] = parsed.map((p: any) => ({
            id: `prj-${p.projectId || p.id}`,
            title: p.title || "Technical Project",
            description: p.requirements || p.description || "Active technical project listing",
            href: "/technology/user/projects",
            category: "services" as SearchCategory,
            keywords: ["technology", "project", "code", "development", ...(p.title || "").toLowerCase().split(/\s+/)],
            badge: "Live Project",
          }));
          currentIndex = [...dynamicItems, ...UNIVERSAL_SEARCH_INDEX];
        }
      }
    } catch {}
  }

  const scored = currentIndex.map((item) => ({
    item,
    score: scoreItem(item, q),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const groups: GroupedSearchResults = {}
  for (const { item } of scored) {
    const list = groups[item.category] ?? []
    if (list.length < limitPerCategory) {
      list.push(item)
      groups[item.category] = list
    }
  }

  const flat = scored.map((x) => x.item)
  const aiAnswer = buildAiAnswer(query, flat)

  return {
    query: query.trim(),
    groups,
    flat,
    aiAnswer,
    total: flat.length,
  }
}

export function getSuggestions(query: string, limit = 8): SearchResultItem[] {
  return universalSearch(query, 3).flat.slice(0, limit)
}
