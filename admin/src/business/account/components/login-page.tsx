"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import type { Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { FormTextInput } from "@/src/shared/ui/form/form-text-input"
// import { FormCheckbox } from "@/src/shared/ui/form/form-checkbox"
import { FormActions } from "@/src/shared/ui/form/FormActions"
import { Form } from "@/src/shared/ui/form/form"
import { useAppDispatch, useAppSelector } from "@/src/core/store/hooks"
import { loginUser, clearError } from "@/src/core/store/slices/authSlice"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import FormCheckbox from "@/src/shared/ui/form/form-checkbox"
import { AlertOctagon } from "lucide-react"


const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>



interface LoginPageProps {
  onForgotPassword?: () => void
  onSignup?: () => void
  onSuccess?: (email?: string) => void
}

export function LoginPage({ onForgotPassword, onSuccess }: LoginPageProps) {
  const dispatch = useAppDispatch()
  const { loading, error, isAuthenticated, token } = useAppSelector((state) => state.auth)
  const router = useRouter()
  
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; status: string; description: string }>({
    isOpen: false,
    status: "",
    description: ""
  })

  const form = useForm<LoginFormValues>({
    // Cast resolver to the expected Resolver type to avoid type incompatibilities
    resolver: zodResolver(loginSchema) as unknown as Resolver<LoginFormValues, any>,
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  useEffect(() => {
    if (error) {
      const upperError = error.toUpperCase()
      if (['PENDING', 'SUSPEND', 'DORMANT', 'CLOSED', 'BLOCK'].includes(upperError)) {
        let description = "Your account is not active."
        if (upperError === 'PENDING') description = "Your account is currently under review by another Super Admin."
        else if (upperError === 'SUSPEND') description = "Your account has been temporarily suspended."
        else if (upperError === 'DORMANT') description = "Your account is inactive due to long periods of no activity."
        else if (upperError === 'CLOSED') description = "Your account has been closed."
        else if (upperError === 'BLOCK') description = "Your account has been permanently blocked. Contact support."
        
        setStatusModal({ isOpen: true, status: upperError, description })
      } else {
        toast.error(error)
      }
      dispatch(clearError())
    }
  }, [error, dispatch])

  useEffect(() => {
    if (isAuthenticated || token) {
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/dashboard")
      }
    }
  }, [isAuthenticated, token, router, onSuccess])

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await dispatch(loginUser({ email: data.email, password: data.password })).unwrap();
      toast.success("Successfully logged in");
    } catch (err) {
      // Errors are handled by the useEffect watching the Redux error state
    }
  }

  if (isAuthenticated || token) {
    return null; // Or a loading spinner
  }


  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[85vh]">
      <div className="relative w-full px-4" style={{ maxWidth: '480px' }}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight mb-2">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your credentials to access the secure system database</p>
          </div>

          {/* Form Content */}
          <div className="p-8 pt-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Email Or Phone</label>
                  <div className="transition-all duration-200 focus-within:scale-[1.02]">
                    <FormTextInput
                      control={form.control}
                      name="email"
                      placeholder="admin@systemdb.com"
                      className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Password</label>
                  <div className="transition-all duration-200 focus-within:scale-[1.02]">
                    <FormTextInput
                      control={form.control}
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="placeholder:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium tracking-widest"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <FormCheckbox control={form.control} name="rememberMe" label={"Remember me"} />
                  <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    Forgot Password?
                  </button>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-md bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authenticating...
                      </>
                    ) : "Secure Log In"}
                  </button>
                </div>

              </form>
            </Form>
          </div>
        </div>
      </div>

      {/* Status Block Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-blue-50 dark:bg-slate-900 rounded-2xl shadow-2xl p-6 text-center border border-blue-200 dark:border-blue-800">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">Account {statusModal.status}</h3>
            <p className="text-sm text-blue-700/80 dark:text-blue-300 mb-6 leading-relaxed">
              {statusModal.description}
            </p>
            
            <button 
              onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all active:scale-95"
            >
              OK, I Understand
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
