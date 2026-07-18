"use client"

import { Form } from "@/src/shared/ui/form/form"
import { FormInput } from "@/src/shared/ui/form/form-input"
import { Button } from "@/src/shared/ui/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState } from "react"
import { useAppSelector } from "@/src/core/store/hooks"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().regex(passwordRegex, "Password must be at least 8 characters, include 1 uppercase, 1 number, and 1 special character"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type PasswordFormValues = z.infer<typeof changePasswordSchema>

const SettingLayout = () => {
  const user = useAppSelector((state) => state.auth.user)
  const token = useAppSelector((state) => state.auth.token)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: PasswordFormValues) => {
    if (!user?.email) {
      toast.error("User not logged in");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/admin/api/auth/change-password', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user.email,
          oldPassword: values.oldPassword,
          newPassword: values.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Failed to update password");
      
      toast.success("Password updated successfully");
      form.reset();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[75vh]">
      <div className="relative w-full px-4" style={{ maxWidth: '480px' }}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Change Password</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Update your account password for better security</p>
          </div>

          <div className="p-8 pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Old Password</label>
                  <FormInput
                    control={form.control}
                    name="oldPassword"
                    placeholder="••••••••"
                    type="password"
                    className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium tracking-widest"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">New Password</label>
                  <FormInput
                    control={form.control}
                    name="newPassword"
                    placeholder="••••••••"
                    type="password"
                    showPasswordToggle
                    className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium tracking-widest"
                  />
                </div>
                <div className="space-y-1.5 text-left pb-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Confirm Password</label>
                  <FormInput
                    control={form.control}
                    name="confirmPassword"
                    placeholder="••••••••"
                    type="password"
                    showPasswordToggle
                    className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium tracking-widest"
                  />
                </div>

                <div className="pt-2 flex justify-center">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-md bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:bg-blue-600"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : "Update Password"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingLayout