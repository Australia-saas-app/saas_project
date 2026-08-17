"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, Controller, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/form/label";
import FileUpload from "@/src/components/form/FileUpload";
import ReactSelectMulti from "@/src/components/form/ReactSelectMulti";
import { createProject } from "../services/technical.services";
import { registerContact } from "@/src/shared/lib/contacts-store";
import { useUser } from "@/src/context/user.provider";
import { recordRealActivity } from "@/src/shared/lib/real-activity-logger";
import { toast } from "sonner";
import {
  Loader2,
  FolderKanban,
  Code2,
  DollarSign,
  CheckCircle,
  Briefcase,
  X,
  Sparkles,
  Phone,
  Mail,
  User,
} from "lucide-react";

// Schema for technical service project submission
const projectSchema = z.object({
  title: z.string().min(3, "Service / Project title is required (min 3 characters)"),
  projectType: z.string().min(1, "Please select a service type"),
  category: z.string().min(1, "Please select a category"),
  subcategory: z.string().optional(),
  requiredSkills: z.array(z.string()).min(1, "Please select at least one required skill"),
  preferredLanguages: z.array(z.string()).min(1, "Please select at least one programming language"),
  expectedStartDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  currency: z.string().optional(),
  budgetAmount: z.string().min(1, "Budget amount is required"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().min(6, "Phone number is required (min 6 digits)"),
  referenceName: z.string().optional(),
  attachments: z.any().optional(),
  description: z
    .string()
    .min(1, "Service summary is required")
    .max(150, "Summary cannot exceed 150 characters"),
});

type ProjectForm = z.infer<typeof projectSchema>;

const STEPS = [
  { id: 0, label: "Basic Info", icon: Briefcase },
  { id: 1, label: "Tech Stack & Skills", icon: Code2 },
  { id: 2, label: "Pricing & Scope", icon: DollarSign },
  { id: 3, label: "Review & Submit", icon: CheckCircle },
];

const projectTypeOptions = [
  { value: "New Build", label: "New Build" },
  { value: "Upgrade", label: "Upgrade" },
  { value: "Troubleshooting", label: "Troubleshooting" },
  { value: "Maintenance", label: "Maintenance" },
  { value: "Installation", label: "Installation" },
];

const categoryOptions = [
  { value: "Software Development", label: "Software Development" },
  { value: "Web Design & UI/UX", label: "Web Design & UI/UX" },
  { value: "QA & Testing", label: "QA & Testing" },
  { value: "Troubleshooting", label: "Troubleshooting" },
  { value: "Maintenance", label: "Maintenance" },
];

const CATEGORY_SUBCATEGORY_MAP: Record<string, { value: string; label: string }[]> = {
  "Software Development": [
    { value: "Web Development", label: "Web Development" },
    { value: "Frontend Development", label: "Frontend Development" },
    { value: "Backend Development", label: "Backend Development" },
    { value: "Fullstack Development", label: "Fullstack Development" },
    { value: "Mobile App Development", label: "Mobile App Development" },
    { value: "DevOps & Cloud Infrastructure", label: "DevOps & Cloud Infrastructure" },
    { value: "AI & Machine Learning", label: "AI & Machine Learning" },
    { value: "API & Microservices", label: "API & Microservices Architecture" },
  ],
  "Web Design & UI/UX": [
    { value: "UI/UX Design", label: "UI/UX Design" },
    { value: "Figma Prototyping", label: "Figma Prototyping & Wireframing" },
    { value: "Website Redesign", label: "Website Redesign" },
    { value: "Landing Page Design", label: "Landing Page Design" },
    { value: "Design System & Brand Assets", label: "Design System & Brand Assets" },
  ],
  "QA & Testing": [
    { value: "Automation Testing", label: "Automation Testing (Cypress / Playwright / Selenium)" },
    { value: "Manual QA Testing", label: "Manual QA & Test Plan Creation" },
    { value: "Performance Testing", label: "Performance & Load Testing" },
    { value: "Security Audit", label: "Security & Vulnerability Audit" },
  ],
  "Troubleshooting": [
    { value: "Bug Fixing", label: "Bug Fixing & Debugging" },
    { value: "Code Review", label: "Code Review & Refactoring" },
    { value: "Security Patching", label: "Security Patching" },
    { value: "Performance Optimization", label: "Performance Optimization" },
  ],
  "Maintenance": [
    { value: "Server Maintenance", label: "Server & Database Maintenance" },
    { value: "App Updates", label: "Application Updates & Version Migration" },
    { value: "Routine Backups", label: "Routine Backups & Security Monitoring" },
  ],
};

const DEFAULT_SUBCATEGORIES = [
  { value: "Web Development", label: "Web Development" },
  { value: "Frontend Development", label: "Frontend Development" },
  { value: "Backend Development", label: "Backend Development" },
  { value: "Mobile App Development", label: "Mobile App Development" },
  { value: "UI/UX Design", label: "UI/UX Design" },
  { value: "DevOps", label: "DevOps & Cloud" },
];

const CATEGORY_SKILLS_MAP: Record<string, { value: string; label: string }[]> = {
  "Software Development": [
    { value: "React", label: "React.js" },
    { value: "Next.js", label: "Next.js (App Router / SSR)" },
    { value: "Vue.js", label: "Vue.js / Nuxt.js" },
    { value: "Angular", label: "Angular" },
    { value: "Svelte", label: "Svelte / SvelteKit" },
    { value: "Tailwind CSS", label: "Tailwind CSS" },
    { value: "HTML5/CSS3", label: "HTML5 & Modern CSS" },
    { value: "Node.js", label: "Node.js" },
    { value: "Express.js", label: "Express.js" },
    { value: "NestJS", label: "NestJS" },
    { value: "Django", label: "Django (Python)" },
    { value: "FastAPI", label: "FastAPI" },
    { value: "Spring Boot", label: "Spring Boot (Java)" },
    { value: "ASP.NET Core", label: "ASP.NET Core (C#)" },
    { value: "Laravel", label: "Laravel (PHP)" },
    { value: "REST APIs", label: "REST APIs & Endpoints" },
    { value: "GraphQL", label: "GraphQL" },
    { value: "PostgreSQL", label: "PostgreSQL" },
    { value: "MongoDB", label: "MongoDB" },
    { value: "MySQL", label: "MySQL" },
    { value: "Redis", label: "Redis Caching" },
    { value: "Docker", label: "Docker Containers" },
    { value: "Kubernetes", label: "Kubernetes" },
    { value: "AWS", label: "AWS Cloud" },
    { value: "React Native", label: "React Native" },
    { value: "Flutter", label: "Flutter" },
  ],
  "Web Design & UI/UX": [
    { value: "Figma", label: "Figma UI/UX Design" },
    { value: "Adobe XD", label: "Adobe XD" },
    { value: "Wireframing", label: "Wireframing & UX Prototyping" },
    { value: "Design Systems", label: "Design Systems & Tokens" },
    { value: "UX Research", label: "UX Research & User Testing" },
    { value: "Responsive Web Design", label: "Responsive Web Design" },
    { value: "Mobile UI Design", label: "Mobile App UI Design" },
    { value: "Landing Page Design", label: "High-Converting Landing Pages" },
    { value: "Tailwind CSS", label: "Tailwind CSS Styling" },
    { value: "HTML5/CSS3", label: "HTML5 & CSS3" },
    { value: "Brand Identity", label: "Graphic & Brand Identity" },
    { value: "Web Accessibility (WCAG)", label: "Web Accessibility (WCAG)" },
  ],
  "QA & Testing": [
    { value: "Cypress", label: "Cypress End-to-End Testing" },
    { value: "Playwright", label: "Playwright Automation" },
    { value: "Selenium", label: "Selenium WebDriver" },
    { value: "Jest / Vitest", label: "Jest & Vitest Unit Testing" },
    { value: "Postman", label: "Postman API Automation" },
    { value: "Manual QA", label: "Manual QA & Test Cases" },
    { value: "Load Testing", label: "Load Testing (k6 / JMeter)" },
    { value: "Security Audit", label: "Security & Vulnerability Audit" },
    { value: "CI/CD Test Automation", label: "CI/CD Test Pipelines" },
  ],
  "Troubleshooting": [
    { value: "Bug Fixing", label: "Bug Fixing & Issue Resolution" },
    { value: "Code Review & Refactoring", label: "Code Review & Refactoring" },
    { value: "Performance Tuning", label: "Performance Tuning & Speed Optimization" },
    { value: "Security Patching", label: "Security Patching & Vulnerability Fixes" },
    { value: "Database Query Optimization", label: "Database Query Optimization" },
    { value: "API Debugging", label: "API Integration & Webhook Debugging" },
    { value: "Memory Leak Resolution", label: "Server Crash & Memory Leak Resolution" },
  ],
  "Maintenance": [
    { value: "Server Maintenance", label: "Server & VPS Maintenance (Linux / Ubuntu)" },
    { value: "Database Maintenance", label: "Database Maintenance & Indexing" },
    { value: "Automated Backups", label: "Automated Backup & Disaster Recovery" },
    { value: "SSL & DNS Management", label: "SSL Certificates & DNS Management" },
    { value: "Dependency Upgrades", label: "Package & Dependency Version Upgrades" },
    { value: "Security Monitoring", label: "24/7 Security & Uptime Monitoring" },
  ],
};

const DEFAULT_SKILLS = [
  { value: "React", label: "React.js" },
  { value: "Next.js", label: "Next.js" },
  { value: "Vue.js", label: "Vue.js" },
  { value: "Node.js", label: "Node.js" },
  { value: "Express.js", label: "Express.js" },
  { value: "NestJS", label: "NestJS" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "Python", label: "Python" },
  { value: "REST APIs", label: "REST APIs" },
  { value: "GraphQL", label: "GraphQL" },
  { value: "PostgreSQL", label: "PostgreSQL" },
  { value: "MongoDB", label: "MongoDB" },
  { value: "Docker", label: "Docker" },
  { value: "AWS", label: "AWS Cloud" },
  { value: "Figma", label: "Figma" },
  { value: "Tailwind CSS", label: "Tailwind CSS" },
];

const programmingLanguagesOptions = [
  { value: "JavaScript", label: "JavaScript (ES6+)" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "Python", label: "Python 3" },
  { value: "Java", label: "Java" },
  { value: "C#", label: "C# (.NET)" },
  { value: "C++", label: "C / C++" },
  { value: "PHP", label: "PHP (8.x)" },
  { value: "Go", label: "Go (Golang)" },
  { value: "Rust", label: "Rust" },
  { value: "Kotlin", label: "Kotlin (Android)" },
  { value: "Swift", label: "Swift (iOS / macOS)" },
  { value: "Dart", label: "Dart (Flutter)" },
  { value: "Ruby", label: "Ruby" },
  { value: "SQL", label: "SQL / PL-SQL" },
  { value: "HTML5/CSS3", label: "HTML5 / CSS3" },
  { value: "Shell/Bash", label: "Shell / Bash Scripting" },
  { value: "Solidity", label: "Solidity (Web3 / Smart Contracts)" },
  { value: "R", label: "R (Data Science)" },
];

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "BDT", label: "BDT (৳)" },
];

export default function CreateProjectLayout() {
  const [step, setStep] = useState(0);

  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      projectType: "New Build",
      category: "Software Development",
      subcategory: "Web Development",
      requiredSkills: [],
      preferredLanguages: [],
      currency: "USD",
      budgetAmount: "",
      paymentTerms: "One-time",
      fullName: "",
      email: "",
      phone: "",
      description: "",
    },
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = form;

  const formValues = form.getValues();
  const selectedCategory = useWatch({ control, name: "category" });
  const descriptionValue = useWatch({ control, name: "description" }) || "";

  const availableSubcategories =
    selectedCategory && CATEGORY_SUBCATEGORY_MAP[selectedCategory]
      ? CATEGORY_SUBCATEGORY_MAP[selectedCategory]
      : DEFAULT_SUBCATEGORIES;

  const availableSkills =
    selectedCategory && CATEGORY_SKILLS_MAP[selectedCategory]
      ? CATEGORY_SKILLS_MAP[selectedCategory]
      : DEFAULT_SKILLS;

  const router = useRouter();
  const { user } = useUser();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: ProjectForm) => {
    setSubmitting(true);
    try {
      let attachmentData: any = null;
      if (data.attachments && typeof data.attachments === "object" && data.attachments.name) {
        try {
          const toBase64 = (file: File) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            });
          const base64Url = await toBase64(data.attachments);
          attachmentData = {
            name: data.attachments.name,
            size: data.attachments.size,
            type: data.attachments.type,
            url: base64Url,
          };
        } catch {
          attachmentData = {
            name: data.attachments.name,
            size: data.attachments.size,
            type: data.attachments.type,
            url: URL.createObjectURL(data.attachments),
          };
        }
      }

      const clientFullName =
        data.fullName ||
        (user as any)?.fullName ||
        (user as any)?.name ||
        ("firstName" in (user || {}) ? `${(user as any).firstName} ${(user as any).lastName || ""}`.trim() : "") ||
        "User";

      const budgetNum = Number(data.budgetAmount) || 0;
      const payload = {
        title: data.title,
        description: data.description || `${data.title} (${data.projectType})`,
        price: budgetNum,
        adminBudget: budgetNum,
        minBudget: budgetNum,
        budgetAmount: budgetNum,
        currency: data.currency || "USD",
        category: data.category || "Software Development",
        subcategory: data.subcategory || "General",
        projectType: data.projectType || "New Build",
        skills: data.requiredSkills || [],
        preferredLanguages: data.preferredLanguages || [],
        paymentTerms: data.paymentTerms || "One-time",
        clientName: clientFullName,
        clientEmail: data.email || user?.email,
        clientPhone: data.phone,
        attachmentFile: attachmentData,
        startDate: data.expectedStartDate ? new Date(data.expectedStartDate).toISOString() : undefined,
        endDate: data.expectedEndDate ? new Date(data.expectedEndDate).toISOString() : undefined,
        userId: (user as any)?.id || (user as any)?.userId || (user as any)?.sub,
      };

      // Save contact to local contacts directory and live chat
      if (data.fullName && data.email) {
        registerContact({
          name: clientFullName,
          email: data.email,
          phone: data.phone,
          role: "user",
        });
      }

      const created = await createProject(payload);
      const projectId = created?.data?.projectId || created?.projectId;

      // Explicitly record activity log for project creation & submission
      try {
        await recordRealActivity(
          "SERVICE_CREATED",
          `Created & submitted project: "${data.title}" (${projectId || "PRJ"}) - Budget: $${Number(data.budgetAmount || 0).toFixed(2)} USD`,
          {
            userId: (user as any)?.id || (user as any)?.userId || (user as any)?.sub,
            name: clientFullName,
            fullName: clientFullName,
            email: data.email || user?.email,
          }
        );
      } catch {}

      toast.success("Service project submitted successfully! It is now under Admin review.");
      router.push("/dashboard/user/technical");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step-by-step validation fields
  const stepValidationFields: (keyof ProjectForm)[][] = [
    ["title", "category", "description"],
    ["requiredSkills", "preferredLanguages", "projectType"],
    ["budgetAmount", "paymentTerms", "fullName", "email", "phone"],
    ["title"],
  ];

  const next = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const fieldsToValidate = stepValidationFields[step];
    const isValid = await form.trigger(fieldsToValidate as any);
    if (!isValid) {
      toast.error("Please fill in all required fields marked with *");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <span>&lt;/&gt; TECHNICAL VERTICAL</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-1">
            Submit Technical Project &amp; Service
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Specify your project requirements, scope, tech stack, and budget to get admin review and verified provider matching.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-xl border-border text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
        >
          <Link href="/dashboard/user/technical">Cancel &amp; Exit</Link>
        </Button>
      </div>

      {/* Stepper Navigation Bar with Blue Complete Tick */}
      <div className="rounded-2xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < step) setStep(s.id);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                  isActive
                    ? "bg-primary/10 border border-primary/40 shadow-xs"
                    : isCompleted
                    ? "hover:bg-muted cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : isCompleted
                      ? "bg-primary text-white shadow-xs"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "✓" : s.id + 1}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-bold truncate ${
                      isActive || isCompleted ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {s.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Step Form Card */}
      <Card className="p-6 md:p-8 border border-border bg-card shadow-xs rounded-2xl">
        <div>
          {/* STEP 1: BASIC INFO */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Briefcase className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Step 1: Basic Information</h2>
              </div>

              {/* Service Title */}
              <div>
                <Label>Service Title *</Label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Full-Stack Next.js 14 & NestJS Enterprise Web Application Development"
                  className="mt-1"
                />
                {errors.title && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.title.message}</p>
                )}
              </div>

              {/* Category & Sub Category Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue("subcategory", "");
                        }}
                        className="w-full mt-1 p-2.5 border border-border rounded-xl bg-card text-foreground text-xs font-medium cursor-pointer focus:border-primary focus:outline-none transition-colors"
                      >
                        {categoryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <Label>Sub Category (Optional)</Label>
                  <Controller
                    name="subcategory"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full mt-1 p-2.5 border border-border rounded-xl bg-card text-foreground text-xs font-medium cursor-pointer focus:border-primary focus:outline-none transition-colors"
                      >
                        {availableSubcategories.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>

              {/* Short Service Summary (Max 150 chars) */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Short Project / Service Summary * (Max 150 characters)</Label>
                  <span
                    className={`text-xs font-semibold ${
                      descriptionValue.length > 150
                        ? "text-rose-500 font-bold"
                        : descriptionValue.length >= 130
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {descriptionValue.length} / 150 characters
                  </span>
                </div>
                <textarea
                  {...register("description")}
                  maxLength={150}
                  rows={3}
                  placeholder="Describe your project requirements, scope, architecture needs..."
                  className="w-full mt-1 p-3 border border-border rounded-xl bg-card text-foreground text-xs font-medium focus:border-primary focus:outline-none transition-colors resize-none"
                />
                {errors.description && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">{errors.description.message}</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: TECH STACK & SKILLS */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Code2 className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Step 2: Tech Stack &amp; Skills</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Project / Service Type *</Label>
                  <Controller
                    name="projectType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full mt-1 p-2.5 border border-border rounded-xl bg-card text-foreground text-xs font-medium cursor-pointer focus:border-primary focus:outline-none transition-colors"
                      >
                        {projectTypeOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                  {errors.projectType && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.projectType.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Programming / Tech Languages *</Label>
                  <Controller
                    name="preferredLanguages"
                    control={control}
                    render={({ field }) => (
                      <ReactSelectMulti
                        value={field.value || []}
                        onChange={(vals: string[]) => setValue("preferredLanguages", vals)}
                        options={programmingLanguagesOptions}
                        placeholder="Select languages (e.g. TypeScript, JavaScript, Python...)"
                      />
                    )}
                  />
                  {errors.preferredLanguages && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.preferredLanguages.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label>Required Skills &amp; Frameworks * (Select all that apply)</Label>
                <Controller
                  name="requiredSkills"
                  control={control}
                  render={({ field }) => (
                    <ReactSelectMulti
                      value={field.value || []}
                      onChange={(vals: string[]) => setValue("requiredSkills", vals)}
                      options={availableSkills}
                      placeholder="Select frameworks & skills (e.g. Next.js, React, NestJS, APIs...)"
                    />
                  )}
                />
                {errors.requiredSkills && (
                  <p className="text-xs text-rose-500 mt-1 font-medium">
                    {errors.requiredSkills.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PRICING & SCOPE */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Step 3: Pricing &amp; Scope</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Budget Amount *</Label>
                  <Input
                    {...register("budgetAmount")}
                    placeholder="e.g. 2500"
                    className="mt-1"
                  />
                  {errors.budgetAmount && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.budgetAmount.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full mt-1 p-2.5 border border-border rounded-xl bg-card text-foreground text-xs font-medium cursor-pointer focus:border-primary focus:outline-none transition-colors"
                      >
                        {currencyOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <Label>Payment Terms *</Label>
                  <Controller
                    name="paymentTerms"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full mt-1 p-2.5 border border-border rounded-xl bg-card text-foreground text-xs font-medium cursor-pointer focus:border-primary focus:outline-none transition-colors"
                      >
                        <option value="One-time">One-time full payment</option>
                        <option value="Two">2-Phase Milestone payment</option>
                        <option value="Three">3-Phase Milestone payment</option>
                        <option value="Four">4-Phase Milestone payment</option>
                        <option value="Five">5-Phase Milestone payment</option>
                      </select>
                    )}
                  />
                  {errors.paymentTerms && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">
                      {errors.paymentTerms.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Expected Start Date (Optional)</Label>
                  <Input
                    type="date"
                    {...register("expectedStartDate")}
                    className="mt-1 [color-scheme:dark]"
                  />
                </div>

                <div>
                  <Label>Expected End Date (Optional)</Label>
                  <Input
                    type="date"
                    {...register("expectedEndDate")}
                    className="mt-1 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                <div>
                  <Label>Full Name *</Label>
                  <Input {...register("fullName")} placeholder="Your full name" className="mt-1" />
                  {errors.fullName && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <Label>Email Address *</Label>
                  <Input
                    {...register("email")}
                    placeholder="name@example.com"
                    className="mt-1"
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label>Phone Number *</Label>
                  <Input
                    {...register("phone")}
                    placeholder="+1 234 567 8900"
                    className="mt-1"
                  />
                  {errors.phone && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <FileUpload
                  onFileChange={(f) => setValue("attachments", f)}
                  accept=".pdf,.doc,.docx,.zip"
                  maxSizeMB={10}
                  label="Scope Attachments (Optional, PDF, DOC, DOCX, ZIP up to 10MB)"
                />
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <CheckCircle className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Step 4: Review &amp; Submit</h2>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-4 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {formValues.category || "Technical Service"}
                    </span>
                    <h3 className="text-lg font-bold text-foreground mt-1">
                      {formValues.title || "Untitled Service Project"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formValues.description || "No description provided"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Target Budget</p>
                    <p className="text-lg font-extrabold text-primary">
                      {formValues.currency || "USD"} ${Number(formValues.budgetAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                      Service Type
                    </span>
                    <span className="font-semibold text-foreground">{formValues.projectType}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                      Sub Category
                    </span>
                    <span className="font-semibold text-foreground">
                      {formValues.subcategory || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                      Payment Terms
                    </span>
                    <span className="font-semibold text-foreground">{formValues.paymentTerms}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                      Contact
                    </span>
                    <span className="font-semibold text-foreground truncate block">
                      {formValues.fullName} ({formValues.phone || formValues.email})
                    </span>
                  </div>
                </div>

                {formValues.requiredSkills && formValues.requiredSkills.length > 0 && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold mb-1">
                      Skills
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {formValues.requiredSkills.map((sk: string) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/30 text-[11px] font-semibold"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p>
                  Upon submission, your technical project is set to{" "}
                  <strong className="text-foreground">Pending Review</strong>. The platform Admin will
                  review your scope, finalize quotes/milestones, and publish it to verified businesses to
                  claim and fulfill.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={back}
                  className="rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Back
                </Button>
              )}
            </div>

            <div>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={next}
                  className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-6 text-xs cursor-pointer shadow-xs"
                >
                  Next Step
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 text-xs cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Project"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
