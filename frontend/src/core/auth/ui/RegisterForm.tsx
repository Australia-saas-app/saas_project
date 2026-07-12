"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Lock, Loader2, Users, Briefcase, UserCheck } from "lucide-react";
import { useAuth } from "@/core/auth/context/AuthContext";
import { registerSchema, RegisterFormData } from "@/shared/utils/validators";
import { Button } from "@/shared/ui/ui/button";
import { Input } from "@/shared/ui/ui/input";
import { Checkbox } from "@/shared/ui/ui/checkbox";

type RoleType = "user" | "affiliate" | "business";

interface RegisterFormProps {
  onToggleForm: (e: React.MouseEvent) => void;
  onSuccess: () => void;
}

const roles: { key: RoleType; label: string; icon: React.ReactNode }[] = [
  { key: "user", label: "User", icon: <User className="w-4 h-4" /> },
  { key: "affiliate", label: "Affiliate", icon: <UserCheck className="w-4 h-4" /> },
  { key: "business", label: "Business", icon: <Briefcase className="w-4 h-4" /> },
];

export function RegisterForm({ onToggleForm, onSuccess }: RegisterFormProps) {
  const { register: formRegister, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "", acceptTerms: false }
  });

  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleType>("user");
  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: RegisterFormData) => {
    setError("");
    setIsLoading(true);
    try {
      await register({
        fullName: data.fullName,
        contact: data.email,
        password: data.password
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to register.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-8 py-6 rounded-2xl bg-white border border-slate-200 shadow-lg">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h2>
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="John Doe"
              className={`pl-9 ${errors.fullName ? 'border-red-500' : ''}`}
              {...formRegister("fullName")}
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Email or Phone</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="you@example.com"
              className={`pl-9 ${errors.email ? 'border-red-500' : ''}`}
              {...formRegister("email")}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="password"
              placeholder="••••••••"
              className={`pl-9 ${errors.password ? 'border-red-500' : ''}`}
              {...formRegister("password")}
            />
          </div>
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="password"
              placeholder="••••••••"
              className={`pl-9 ${errors.confirmPassword ? 'border-red-500' : ''}`}
              {...formRegister("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms Checkbox */}
        <div className="space-y-1 pt-1">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="accept-terms"
              checked={acceptTerms}
              onCheckedChange={(v) => setValue("acceptTerms", !!v, { shouldValidate: true })}
              className="mt-0.5"
            />
            <label htmlFor="accept-terms" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
              I accept the{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>.
            </label>
          </div>
          {errors.acceptTerms && <p className="text-red-500 text-xs">{errors.acceptTerms.message}</p>}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 text-sm font-semibold mt-1"
        >
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : `Create ${roles.find(r => r.key === selectedRole)?.label} Account`}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
