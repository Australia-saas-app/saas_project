"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/form/label";
import FileUpload from "@/src/components/form/FileUpload";
import { RichTextEditor } from "@/src/components/form/RichTextEditor";
import ReactSelectMulti from "@/src/components/form/ReactSelectMulti";
import { createProject, submitProject } from "../services/technical.services";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Zod schema for the full multi-step form
const projectSchema = z.object({
  title: z.string().min(3, "Project title is required"),
  projectType: z.string().min(1, "Select project type"),
  category: z.string().optional(),
  subcategories: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredLanguages: z.array(z.string()).optional(),
  expectedStartDate: z.string().optional(),
  expectedEndDate: z.string().optional(),
  currency: z.string().optional(),
  budgetAmount: z.string().optional(),
  paymentTerms: z.string().optional(),
  fullName: z.string().min(1, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  referenceName: z.string().optional(),
  attachments: z.any().optional(),
  description: z.string().max(1000).optional(),
});

type ProjectForm = z.infer<typeof projectSchema>;

const stepTitles = ["Project Details", "Specifications", "Contact Info", "Additional"];

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
];

const subcategoryOptions = [
  { value: "Web Development", label: "Web Development" },
  { value: "Mobile App Development", label: "Mobile App Development" },
];

const skillsOptions = [
  { value: "HTML5", label: "HTML5" },
  { value: "CSS3", label: "CSS3" },
  { value: "JavaScript", label: "JavaScript (ES6+)" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "React", label: "React.js" },
  { value: "Angular", label: "Angular" },
  { value: "Vue", label: "Vue.js" },
];

const currencyOptions = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "BDT", label: "BDT" },
];

export default function CreateProjectLayout() {
  const [step, setStep] = useState(0);

  const form = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      projectType: "",
      category: "",
      subcategories: [],
      requiredSkills: [],
      preferredLanguages: [],
      currency: "USD",
      budgetAmount: "",
      fullName: "",
      email: "",
      phone: "",
      description: "",
    },
  });

  const { register, handleSubmit, control, setValue } = form;

  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: ProjectForm) => {
    setSubmitting(true);
    try {
      const payload = {
        title: data.title,
        description: data.description || `${data.title} (${data.projectType})`,
        price: Number(data.budgetAmount) || 0,
        currency: data.currency || "USD",
        category: data.category || "Software Development",
        subcategory: data.subcategories?.[0] || "Web Development",
        projectType: data.projectType || "New Build",
        skills: data.requiredSkills || [],
        clientName: data.fullName,
        startDate: data.expectedStartDate ? new Date(data.expectedStartDate).toISOString() : undefined,
        endDate: data.expectedEndDate ? new Date(data.expectedEndDate).toISOString() : undefined,
      };

      const created = await createProject(payload);
      const projectId = created?.data?.projectId || created?.projectId;

      if (projectId) {
        await submitProject(projectId);
      }

      toast.success("Project submitted successfully! It is now under Admin review.");
      router.push("/dashboard/user/technical");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // simple step navigation
  const next = async () => {
    setStep((s) => Math.min(s + 1, stepTitles.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  // responsive grid column helper
  const twoCol = "grid grid-cols-1 md:grid-cols-2 gap-4";

  return (
    <div className="p-4 md:p-8">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-6">
        {stepTitles.map((t, i) => (
          <div key={t} className="flex-1 text-center">
            <div
              className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center border ${
                i <= step ? "bg-primary text-white" : "bg-card text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            <div
              className={`text-xs mt-2 ${i === step ? "font-semibold text-primary" : "text-slate-500"}`}
            >
              {t}
            </div>
          </div>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-2xl text-primary font-semibold mb-4">{stepTitles[step]}</h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 0 && (
            <div className="space-y-4">
              <div className={twoCol}>
                <div>
                  <Label>Project Title*</Label>
                  <Input {...register("title")} className="mt-1" />
                </div>

                <div>
                  <Label>Project Type*</Label>
                  <Controller
                    name="projectType"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="w-full mt-1 p-2 border rounded bg-card">
                        <option value="">Select type</option>
                        {projectTypeOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>

              <div className={twoCol}>
                <div>
                  <Label>Category</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="w-full mt-1 p-2 border rounded bg-card">
                        <option value="">Select category</option>
                        {categoryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <Label>Subcategory</Label>
                  <Controller
                    name="subcategories"
                    control={control}
                    render={({ field }) => (
                      <ReactSelectMulti
                        value={field.value || []}
                        onChange={(vals: string[]) => setValue("subcategories", vals)}
                        options={subcategoryOptions}
                        placeholder="Select subcategories"
                      />
                    )}
                  />
                </div>
              </div>

              <div>
                <Label>Required Skills</Label>
                <Controller
                  name="requiredSkills"
                  control={control}
                  render={({ field }) => (
                    <ReactSelectMulti
                      value={field.value || []}
                      onChange={(vals: string[]) => setValue("requiredSkills", vals)}
                      options={skillsOptions}
                      placeholder="Select skills"
                    />
                  )}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className={twoCol}>
                <div>
                  <Label>Preferred Languages</Label>
                  <Controller
                    name="preferredLanguages"
                    control={control}
                    render={({ field }) => (
                      <ReactSelectMulti
                        value={field.value || []}
                        onChange={(vals: string[]) => setValue("preferredLanguages", vals)}
                        options={[
                          { value: "English", label: "English" },
                          { value: "Bangla", label: "Bangla" },
                        ]}
                        placeholder="Select languages"
                      />
                    )}
                  />
                </div>

                <div>
                  <Label>Expected Start Date</Label>
                  <Input type="date" {...register("expectedStartDate")} className="mt-1" />
                </div>
              </div>

              <div className={twoCol}>
                <div>
                  <Label>Expected End Date*</Label>
                  <Input type="date" {...register("expectedEndDate")} className="mt-1" />
                </div>

                <div>
                  <Label>Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="w-full mt-1 p-2 border rounded bg-card">
                        {currencyOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>

              <div className={twoCol}>
                <div>
                  <Label>Budget Amount*</Label>
                  <Input {...register("budgetAmount")} placeholder="Amount" className="mt-1" />
                </div>

                <div>
                  <Label>Payment Terms</Label>
                  <Controller
                    name="paymentTerms"
                    control={control}
                    render={({ field }) => (
                      <select {...field} className="w-full mt-1 p-2 border rounded bg-card">
                        <option value="">Select terms</option>
                        <option value="One-time">One-time payment</option>
                        <option value="Two">Two time payment</option>
                        <option value="Three">Three time payment</option>
                        <option value="Four">Four time payment</option>
                        <option value="Five">Five time payment</option>
                      </select>
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={twoCol}>
              <div>
                <Label>Full Name*</Label>
                <Input {...register("fullName")} className="mt-1" />
              </div>

              <div>
                <Label>Email Address*</Label>
                <Input {...register("email")} className="mt-1" />
              </div>

              <div className="md:col-span-2">
                <Label>Phone Number*</Label>
                <Input {...register("phone")} className="mt-1" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label>Reference Name (Optional)</Label>
                <Input {...register("referenceName")} className="mt-1" />
              </div>

              <div>
                <Label>Attachment (Optional)</Label>
                <Controller
                  name="attachments"
                  control={control}
                  render={() => (
                    <FileUpload
                      onFileChange={(f) => setValue("attachments", f)}
                      label="Choose File"
                    />
                  )}
                />
              </div>

              <div>
                <Label>Project Description (Optional)</Label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={(v) => setValue("description", v)}
                    />
                  )}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div>
              {step > 0 && (
                <Button variant="outline" onClick={back} className="mr-3">
                  Back
                </Button>
              )}
            </div>

            <div>
              {step < stepTitles.length - 1 ? (
                <Button onClick={next}>Next</Button>
              ) : (
                <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Project"
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
