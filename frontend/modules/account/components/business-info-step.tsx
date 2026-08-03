"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { FormTextInput } from "@/src/components/form/form-text-input"
import { FormSelect } from "@/src/components/form/form-select"
import { Form } from "@/src/components/form/form"


const businessInfoSchema = z.object({
  businessType: z.enum([
    "Technology",
    "Construction",
    "Real Estate",
    "Commercial & Industrial",
    "Visa & Travel",
    "Education",
    "Careers",
    "Healthcare",
    "Marketplace",
    "Business",
    "Investment",
    "Donations",
  ]),
  businessName: z.string().min(2, "Business name is required"),
  // logo will be a data URL string when uploaded
  logo: z.string().optional(),
  categories: z.array(z.string()).min(1, "Select at least one category"),
  subcategories: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  serviceAreas: z.array(z.string()).min(1, "Select at least one service area"),
  supportedLanguages: z.array(z.string()).min(1, "Select at least one language"),
  officeCountry: z.string().min(1, "Country is required"),
  officeState: z.string().min(1, "State is required"),
  officeCity: z.string().min(1, "City is required"),
  officeZip: z.string().min(1, "Zip code is required"),
  officeAddress: z.string().min(5, "Address is required"),
  employeesRange: z.enum(["01-30", "30-70", "70-150", "150-300", "300-500", "500-700", "700-1000+" ]),
  socialLinks: z.array(z.string()).optional(),
  currency: z.string().min(1, "Currency is required"),
  businessPhone: z.string().min(6, "Business phone is required"),
  businessEmail: z.string().email("Invalid business email"),
  registrationNumber: z.string().optional(),
  registrationCertificate: z.string().optional(),
  taxId: z.string().optional(),
  taxCertificate: z.string().optional(),
  utilityBill: z.string().optional(),
  partnershipAgreement: z.string().optional(),
  description: z.string().min(10, "Provide a short description of services"),
})

type BusinessInfoFormValues = z.infer<typeof businessInfoSchema>

interface BusinessInfoStepProps {
  onNext: (data: BusinessInfoFormValues) => void
  onBack: () => void
  initialData?: any
  accountType: string
  isLastStep: boolean
}

const businessTypes = [
  "Technology",
  "Construction",
  "Real Estate",
  "Commercial & Industrial",
  "Visa & Travel",
  "Education",
  "Careers",
  "Healthcare",
  "Marketplace",
  "Business",
  "Investment",
  "Donations",
]

const employeeRanges = ["01-30", "30-70", "70-150", "150-300", "300-500", "500-700", "700-1000+"]

export function BusinessInfoStep({ onNext, onBack, initialData = {} }: BusinessInfoStepProps) {
  const form = useForm<BusinessInfoFormValues>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessType: (initialData.businessType as any) || "Technology",
      businessName: initialData.businessName || "",
      logo: initialData.logo || "",
      categories: initialData.categories || [],
      subcategories: initialData.subcategories || [],
      requiredSkills: initialData.requiredSkills || [],
      serviceAreas: initialData.serviceAreas || [],
      supportedLanguages: initialData.supportedLanguages || ["English"],
      officeCountry: initialData.officeCountry || "",
      officeState: initialData.officeState || "",
      officeCity: initialData.officeCity || "",
      officeZip: initialData.officeZip || "",
      officeAddress: initialData.officeAddress || "",
      employeesRange: (initialData.employeesRange as any) || "01-30",
      socialLinks: initialData.socialLinks || [],
      currency: initialData.currency || "USD",
      businessPhone: initialData.businessPhone || "",
      businessEmail: initialData.businessEmail || "",
      registrationNumber: initialData.registrationNumber || "",
      registrationCertificate: initialData.registrationCertificate || "",
      taxId: initialData.taxId || "",
      taxCertificate: initialData.taxCertificate || "",
      utilityBill: initialData.utilityBill || "",
      partnershipAgreement: initialData.partnershipAgreement || "",
      description: initialData.description || "",
    },
  })

  const onSubmit = (data: BusinessInfoFormValues) => {
    onNext(data)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, name: keyof BusinessInfoFormValues) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      let result = reader.result as string
      try {
        const { compressImageFile } = await import("@/src/shared/lib/image-compressor");
        result = await compressImageFile(file, 1200, 1200, 0.85);
      } catch (e) {
        console.error("Compression failed", e);
      }
      form.setValue(name as any, result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card className="w-full shadow-none bg-base-100  lg:w-2/3 mx-auto border-2 border-border/50">
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <CardDescription>Provide details about your business so we can verify and list your services.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Business Type</label>
              <FormSelect control={form.control} name="businessType" placeholder="Select type" options={businessTypes.map((b) => ({ value: b, label: b }))} />
            </div>

            <div>
              <label className="text-sm font-medium">Business Name</label>
              <FormTextInput control={form.control} name="businessName" placeholder="Your business name" />
            </div>

            <div>
              <label className="text-sm font-medium">Business Logo (PNG / SVG, 50-150px)</label>
              <input type="file" accept="image/png,image/svg+xml" onChange={(e) => handleFileChange(e, "logo")} />
            </div>

            <div>
              <label className="text-sm font-medium">Categories (comma separated)</label>
              <FormTextInput control={form.control} name="categories" placeholder="eg. Design, Development" />
            </div>

            <div>
              <label className="text-sm font-medium">Service Areas (country/state) — comma separated</label>
              <FormTextInput control={form.control} name="serviceAreas" placeholder="eg. USA,CA" />
            </div>

            <div>
              <label className="text-sm font-medium">Supported Languages</label>
              <FormSelect control={form.control} name="supportedLanguages" placeholder="Select" options={[{ value: "English", label: "English" }, { value: "Hindi", label: "Hindi" }]} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Office Country</label>
                <FormTextInput control={form.control} name="officeCountry" placeholder="Country" />
              </div>
              <div>
                <label className="text-sm font-medium">Office State</label>
                <FormTextInput control={form.control} name="officeState" placeholder="State" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Office City</label>
                <FormTextInput control={form.control} name="officeCity" placeholder="City" />
              </div>
              <div>
                <label className="text-sm font-medium">Zip/Postal Code</label>
                <FormTextInput control={form.control} name="officeZip" placeholder="Zip" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Office Address</label>
              <FormTextInput control={form.control} name="officeAddress" placeholder="Street address" />
            </div>

            <div>
              <label className="text-sm font-medium">Employees</label>
              <FormSelect control={form.control} name="employeesRange" placeholder="Select" options={employeeRanges.map((r) => ({ value: r, label: r }))} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Business Phone</label>
                <FormTextInput control={form.control} name="businessPhone" placeholder="Phone number" />
              </div>
              <div>
                <label className="text-sm font-medium">Business Email</label>
                <FormTextInput control={form.control} name="businessEmail" placeholder="email@company.com" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Registration Number</label>
              <FormTextInput control={form.control} name="registrationNumber" placeholder="Registration number" />
            </div>

            <div>
              <label className="text-sm font-medium">Registration Certificate (PDF / Image)</label>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(e, "registrationCertificate")} />
            </div>

            <div>
              <label className="text-sm font-medium">Tax Identification Number</label>
              <FormTextInput control={form.control} name="taxId" placeholder="Tax ID" />
            </div>

            <div>
              <label className="text-sm font-medium">Tax/VAT Certificate</label>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(e, "taxCertificate")} />
            </div>

            <div>
              <label className="text-sm font-medium">Utility Bill / Bank Statement</label>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(e, "utilityBill")} />
            </div>

            <div>
              <label className="text-sm font-medium">Partnership Agreement (Optional)</label>
              <input type="file" accept="application/pdf,image/*" onChange={(e) => handleFileChange(e, "partnershipAgreement")} />
            </div>

            <div>
              <label className="text-sm font-medium">Description of Services</label>
              <textarea {...form.register("description")} className="w-full mt-2 p-2 border rounded" rows={4} />
            </div>

            <div className="flex gap-3 pt-6">
              <Button type="button" variant="outline" onClick={onBack} className="flex-1">
                Back
              </Button>
              <Button type="submit" className="flex-1">
                Next
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
