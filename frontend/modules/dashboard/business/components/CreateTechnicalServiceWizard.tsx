"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Code,
  DollarSign,
  Layers,
  Sparkles,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/src/lib/axiosInstance";
import { addBusinessService } from "@/src/shared/lib/business-services-store";

const SUB_CATEGORIES = [
  "Web Development",
  "Mobile App Development",
  "Cloud & DevOps",
  "AI & Machine Learning",
  "UI/UX Design",
  "Cybersecurity",
  "Software Architecture",
];

const PRESET_SKILLS = [
  "React",
  "Next.js",
  "TypeScript",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "TailwindCSS",
  "Docker",
  "AWS",
  "Python",
  "GraphQL",
  "MongoDB",
];

export default function CreateTechnicalServiceWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [title, setTitle] = useState("");
  const [category] = useState("Technical");
  const [subCategory, setSubCategory] = useState("Web Development");
  const [summary, setSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  // Skills & Tech Stack Pills
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript", "Node.js"]);
  const [skillInput, setSkillInput] = useState("");

  // Deliverables
  const [deliverables, setDeliverables] = useState<string[]>([
    "Complete Source Code Repository",
    "CI/CD Pipeline Setup",
    "Technical Documentation & API Specs",
  ]);
  const [deliverableInput, setDeliverableInput] = useState("");

  // Pricing & Timeline
  const [pricingType, setPricingType] = useState<"Fixed" | "Hourly">("Fixed");
  const [budget, setBudget] = useState("2500");
  const [deliveryDays, setDeliveryDays] = useState("14");

  // Add Skill Pill
  const addSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Skill "${trimmed}" is already added.`);
      return;
    }
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Add Deliverable
  const addDeliverable = () => {
    const trimmed = deliverableInput.trim();
    if (!trimmed) return;
    setDeliverables([...deliverables, trimmed]);
    setDeliverableInput("");
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleStepNext = () => {
    if (step === 1) {
      if (!title.trim()) return toast.error("Please enter a service title.");
      if (!summary.trim()) return toast.error("Please enter a short summary.");
    }
    if (step === 2) {
      if (skills.length === 0) return toast.error("Please add at least 1 skill tag.");
    }
    if (step === 3) {
      if (!budget.trim() || Number(budget) <= 0) return toast.error("Please enter a valid budget amount.");
    }
    setStep((s) => Math.min(s + 1, 4) as any);
  };

  const handleSubmitService = async () => {
    try {
      // Mapping frontend rich fields to the backend CreateServiceDto
      const descriptionData = JSON.stringify({
        summary,
        budget: pricingType === "Fixed" ? `$${budget}` : `$${budget}/hr`,
        deadline: `${deliveryDays} Days`,
        subCategory,
        skills,
        deliverables,
        client: "Tech Listing Proposal"
      });

      const payload = {
        title,
        photo: coverUrl || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
        tag: subCategory || "Technical",
        category: "Technical",
        description: descriptionData,
        isVisible: false // default pending
      };

      await axiosInstance.post('/technology/services', payload);
      toast.success(`Technical Service "${title}" created and submitted for Admin Verification!`);
      router.push("/business/services");
    } catch (err: any) {
      toast.error(err.message || "Failed to create technical service");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Code className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Technical Vertical</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Post Technical Service</h1>
          <p className="text-sm text-muted-foreground">
            Create a high-impact technical service listing to offer to clients across the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/business/services")}
          className="self-start rounded-lg border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Cancel & Exit
        </button>
      </div>

      {/* Steps Indicator */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { num: 1, label: "Basic Info", icon: Briefcase },
            { num: 2, label: "Tech Stack & Skills", icon: Layers },
            { num: 3, label: "Pricing & Scope", icon: DollarSign },
            { num: 4, label: "Review & Submit", icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const active = step === item.num;
            const done = step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => done && setStep(item.num as any)}
                className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-bold"
                    : done
                    ? "text-foreground hover:bg-muted"
                    : "text-muted-foreground opacity-60"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    active
                      ? "bg-primary text-white"
                      : done
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : item.num}
                </div>
                <span className="hidden text-xs sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Step 1: Basic Information
            </h2>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Service Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full-Stack Next.js 14 & NestJS Enterprise Web Application Development"
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Category</label>
                <select
                  disabled
                  value="Technical Services"
                  className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground outline-none cursor-not-allowed"
                >
                  <option value="Technical Services">Technical Services</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Sub Category</label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  {SUB_CATEGORIES.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Cover Image URL (Optional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Short Service Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe your technical service, architecture approach, codebase structure, and what clients will receive..."
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Tech Stack & Skills Tag Pills */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Step 2: Tech Stack & Skills
            </h2>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Add Required Skills / Tech Stack Tags
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(skillInput);
                    }
                  }}
                  placeholder="Type a skill (e.g. Docker, GraphQL, Kubernetes) and press Enter..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Add Tag
                </button>
              </div>
            </div>

            {/* Quick Skill Presets */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Quick Popular Presets:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SKILLS.map((preset) => {
                  const isSelected = skills.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => (isSelected ? removeSkill(preset) : addSkill(preset))}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-white shadow-xs"
                          : "border border-border bg-muted/50 text-foreground hover:bg-muted"
                      }`}
                    >
                      {isSelected ? `✓ ${preset}` : `+ ${preset}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Theme Styled Skill Pills */}
            <div className="pt-2">
              <p className="mb-2 text-xs font-bold text-foreground">Active Service Tech Stack ({skills.length}):</p>
              {skills.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tech stack skills added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2 rounded-lg border border-border/80 bg-background/60 p-3">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-bold text-primary transition-all hover:bg-primary/25"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="rounded-full p-0.5 text-primary hover:bg-primary hover:text-white transition-colors"
                        title={`Remove ${skill}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Pricing & Deliverables */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" /> Step 3: Pricing & Deliverables Scope
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Pricing Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPricingType("Fixed")}
                    className={`rounded-lg border py-2.5 text-xs font-bold transition-all ${
                      pricingType === "Fixed"
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Fixed Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingType("Hourly")}
                    className={`rounded-lg border py-2.5 text-xs font-bold transition-all ${
                      pricingType === "Hourly"
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    Hourly Rate
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Budget Amount ($USD) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    $
                  </span>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="2500"
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">Target Delivery (Days)</label>
                <input
                  type="number"
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="14"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            {/* Key Deliverables */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Key Project Deliverables</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDeliverable();
                    }
                  }}
                  placeholder="Add a deliverable item (e.g. Unit Tests & CI/CD Pipeline Setup)..."
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="rounded-lg bg-muted border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/80"
                >
                  Add
                </button>
              </div>

              <ul className="space-y-2">
                {deliverables.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeliverable(index)}
                      className="text-muted-foreground hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Step 4: Service Listing Summary & Verification Submit
            </h2>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="relative h-44 w-full bg-muted">
                <img
                  src={
                    coverUrl ||
                    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80"
                  }
                  alt={title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-3 left-3 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white shadow-xs">
                  {category}
                </div>
                <div className="absolute bottom-3 right-3 rounded-full bg-black/75 backdrop-blur-xs px-3 py-1 text-xs font-bold text-white">
                  Status: Pending Approval
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{title || "Untitled Technical Service"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Pricing Model:</span>
                    <span className="font-bold text-foreground">
                      {pricingType === "Fixed" ? `$${budget} Fixed` : `$${budget}/hr Hourly`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Target Timeline:</span>
                    <span className="font-bold text-foreground">{deliveryDays} Days</span>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-foreground mb-2">Required Tech Stack Skills:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-foreground mb-2">Deliverables ({deliverables.length}):</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {deliverables.map((d, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Action Bar */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(s - 1, 1) as any)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleStepNext}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary/90"
            >
              Next Step <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitService}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all"
            >
              <Sparkles className="h-4 w-4" /> Submit Service Listing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
