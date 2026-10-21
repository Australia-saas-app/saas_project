"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/src/components/ui/button"
import { FormTextInput } from "@/src/components/form/form-text-input"
import { Form } from "@/src/components/form/form"
import { FormSelect } from "@/src/components/form/form-select"
import { FormMultiSelect } from "@/src/components/form/form-multiselect"
import { OnboardingStepFrame } from "./onboarding-step-frame"

const schema = z.object({
    businessPhone: z.string().min(6, "Business phone is required"),
    businessEmail: z.string().email("Invalid business email"),
    serviceAreas: z.array(z.string()).min(1, "Select at least one service area"),
    supportedLanguages: z.array(z.string()).min(1, "Select at least one language"),
    officeCountry: z.string().min(1, "Country is required"),
    officeState: z.string().min(1, "State is required"),
    officeCity: z.string().min(1, "City is required"),
    officeZip: z.string().min(1, "Zip code is required"),
    officeAddress: z.string().min(5, "Address is required"),
    employeesRange: z.string().min(1, "Select employee range"),
    socialLinks: z.string().optional(),
    currency: z.string().min(1, "Currency is required"),
})

type FormValues = z.infer<typeof schema>

type BusinessInfoStep2Payload = Omit<FormValues, "socialLinks"> & {
    socialLinks?: string[]
}

interface Props {
    onNext: (data: Partial<BusinessInfoStep2Payload>) => void
    onBack: () => void
    initialData?: Partial<BusinessInfoStep2Payload> & { socialLinks?: string[] | string }
}

export function BusinessInfoStep2({ onNext, onBack, initialData = {} }: Props) {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            businessPhone: initialData.businessPhone || "",
            businessEmail: initialData.businessEmail || "",
            serviceAreas: initialData.serviceAreas || [],
            supportedLanguages: initialData.supportedLanguages || ["English"],
            officeCountry: initialData.officeCountry || "",
            officeState: initialData.officeState || "",
            officeCity: initialData.officeCity || "",
            officeZip: initialData.officeZip || "",
            officeAddress: initialData.officeAddress || "",
            employeesRange: initialData.employeesRange || "01-30",
            socialLinks: initialData.socialLinks?.join?.(", ") ?? initialData.socialLinks ?? "",
            currency: initialData.currency || "USD",
        } as any,
    })

    const onSubmit = (data: FormValues) =>
        onNext({
            ...data,
            socialLinks: data.socialLinks
                ? data.socialLinks.split(",").map((s) => s.trim()).filter(Boolean)
                : [],
        })

    // handleFile removed from this step; file uploads live in Step 3

    const serviceAreaOptions = [
        { value: "usa", label: "United States" },
        { value: "canada", label: "Canada" },
        { value: "uk", label: "United Kingdom" },
        { value: "india", label: "India" },
    ]

    const languageOptions = [
        { value: "English", label: "English" },
        { value: "Hindi", label: "Hindi" },
    ]

    const employeeOptions = [
        { value: "01-30", label: "01-30" },
        { value: "30-70", label: "30-70" },
        { value: "70-150", label: "70-150" },
        { value: "150-300", label: "150-300" },
        { value: "300-500", label: "300-500" },
        { value: "500-700", label: "500-700" },
        { value: "700-1000+", label: "700-1000+" },
    ]

    const currencyOptions = [
        { value: "USD", label: "USD" },
        { value: "INR", label: "INR" },
        { value: "EUR", label: "EUR" },
    ]

    return (
        <OnboardingStepFrame
            title="Contact & location"
            description="Business contact details, service areas, and office address."
        >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Business Phone</label>
                                <FormTextInput control={form.control} name="businessPhone" placeholder="e.g. +18055525963" />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Business Email</label>
                                <FormTextInput control={form.control} name="businessEmail" placeholder="email@company.com" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Service Areas</label>
                                <FormMultiSelect control={form.control} name="serviceAreas" options={serviceAreaOptions} placeholder="Select service areas (countries)" />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Supported Languages</label>
                                <FormMultiSelect control={form.control} name="supportedLanguages" options={languageOptions} placeholder="Select languages" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium">Employees</label>
                                <FormSelect control={form.control} name="employeesRange" placeholder="Select" options={employeeOptions} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Currency</label>
                                <FormSelect control={form.control} name="currency" placeholder="Currency" options={currencyOptions} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium">Office Country</label>
                                <FormTextInput control={form.control} name="officeCountry" placeholder="Country" />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Office State</label>
                                <FormTextInput control={form.control} name="officeState" placeholder="State" />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Office City</label>
                                <FormTextInput control={form.control} name="officeCity" placeholder="City" />
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                            <label className="text-sm font-medium">Office Zip</label>
                            <FormTextInput control={form.control} name="officeZip" placeholder="Zip code" />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Office Address</label>
                            <FormTextInput control={form.control} name="officeAddress" placeholder="Address" />
                        </div>
                         </div>




                        <div>
                            <label className="text-sm font-medium">Social Links</label>
                            <FormTextInput control={form.control} name="socialLinks" placeholder="https://linkedin.com/..., https://twitter.com/..." />
                        </div>




                        <div className="flex gap-3 pt-6">
                            <Button type="button" variant="outline" onClick={onBack} className="flex-1">Back</Button>
                            <Button type="submit" className="flex-1">Continue</Button>
                        </div>
                    </form>
                </Form>
        </OnboardingStepFrame>
    )
}
