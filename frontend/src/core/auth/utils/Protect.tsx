"use client";

import React from "react";
import { useAuth } from "@/core/auth/context/AuthContext";
import { hasPermission, hasAnyPermission, hasAllPermissions, Permission, UserRole } from "./rbac";

interface ProtectProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permissions?: Permission[];
  requireAll?: boolean;
  roles?: UserRole[];
}

export function Protect({ children, fallback = null, permissions, requireAll = false, roles }: ProtectProps) {
  const { user } = useAuth();
  
  if (!user) return fallback;

  // Assuming user has a single primary role, or we map through their roles
  // For the mock, we assume user.roles[0] is their active role for RBAC
  const userRole = (user.roles?.[0] as UserRole) || "customer";

  // Check roles first if provided
  if (roles && roles.length > 0) {
    if (!roles.includes(userRole)) {
      return fallback;
    }
  }

  // Check permissions if provided
  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll 
      ? hasAllPermissions(userRole, permissions) 
      : hasAnyPermission(userRole, permissions);
      
    if (!hasAccess) {
      return fallback;
    }
  }

  return <>{children}</>;
}
