"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Loader2, User, UserCheck, Briefcase, AlertOctagon, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/core/auth/context/AuthContext";
import { loginSchema, LoginFormData } from "@/shared/utils/validators";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Checkbox } from "@/shared/ui/ui/checkbox";
import { toast } from "sonner";

type RoleType = "user" | "affiliate" | "business";

interface LoginFormProps {
  onToggleForm?: (e: React.MouseEvent) => void;
  onForgotPassword?: (e: React.MouseEvent) => void;
}

const roles: { key: RoleType; label: string; icon: React.ReactNode }[] = [
  { key: "user", label: "User", icon: <User className="w-4 h-4" /> },
  { key: "affiliate", label: "Affiliate", icon: <UserCheck className="w-4 h-4" /> },
  { key: "business", label: "Business", icon: <Briefcase className="w-4 h-4" /> },
];

export function LoginForm({ onToggleForm, onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("user");
  const [showPassword, setShowPassword] = useState(false);

  // Status Modal State
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; status: string; description: string }>({
    isOpen: false,
    status: "",
    description: ""
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: data.email, // Can be email or phone
          password: data.password,
          role: selectedRole
        })
      });
      
      const resData = await response.json();
      
      if (!response.ok) {
        if (response.status === 403 && resData.error) {
          // Status Guard Triggered
          const status = resData.error.toUpperCase();
          let description = "Your account is not active.";
          if (status === 'PENDING') description = "Your account is currently under review.";
          else if (status === 'SUSPEND') description = "Your account has been temporarily suspended.";
          else if (status === 'DORMANT') description = "Your account is inactive due to long periods of no activity.";
          else if (status === 'CLOSED') description = "Your account has been closed.";
          else if (status === 'BLOCK') description = "Your account has been permanently blocked. Contact support.";
          
          setStatusModal({ isOpen: true, status, description });
          setIsLoading(false);
          return;
        }
        throw new Error(resData.message || "Failed to login");
      }
      
      // Setup auth context (if needed) and route
      await login(resData.data, resData.token); // Use real backend data
      toast.success("Welcome back! Login successful.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-8 rounded-2xl bg-white border border-slate-200 shadow-lg">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
        <p className="text-slate-500 text-sm mt-1">Access your unified Super App dashboard.</p>
      </div>

      {/* Role Selector */}
      <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
        {roles.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedRole(key)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
              selectedRole === key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email or Phone</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="you@example.com"
              className={`pl-9 ${errors.email ? 'border-red-500 focus-visible:border-red-500' : ''}`}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`pl-9 pr-10 ${errors.password ? 'border-red-500 focus-visible:border-red-500' : ''}`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        {/* Remember me + Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(!!v)}
            />
            <label htmlFor="remember-me" className="text-sm text-slate-600 cursor-pointer select-none">
              Remember me
            </label>
          </div>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 text-sm font-semibold mt-2"
        >
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Log In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
        >
          Sign up
        </button>
      </p>

      {/* Status Block Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <AlertOctagon className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">Account {statusModal.status}</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              {statusModal.description}
            </p>
            
            <Button 
              onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
              className="w-full h-11 text-sm font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm"
            >
              OK, I Understand
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
