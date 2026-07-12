"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Loader2, User, UserCheck, Briefcase } from "lucide-react";
import { useAuth } from "@/core/auth/context/AuthContext";
import { loginSchema, LoginFormData } from "@/shared/utils/validators";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Checkbox } from "@/shared/ui/ui/checkbox";

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

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      if (selectedRole === "business" || data.email.toLowerCase().includes("business")) {
        router.push("/businesses");
      } else {
        router.push("/home");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login.");
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
          {error}
        </div>
      )}

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
              type="password"
              placeholder="••••••••"
              className={`pl-9 ${errors.password ? 'border-red-500 focus-visible:border-red-500' : ''}`}
              {...register("password")}
            />
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
    </div>
  );
}
