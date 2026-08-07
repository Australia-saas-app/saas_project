"use client";

import { useUser } from "@/src/context/user.provider";
import { can, canAll, canAny, Permission, Role } from "@/src/lib/rbac";

/**
 * Hook for checking RBAC permissions in components.
 *
 * Usage:
 *   const { role, can: userCan, isAdmin } = usePermission();
 *   if (userCan("data:export")) { ... }
 */
export function usePermission() {
  const { user } = useUser();
  const role = (user?.role as Role) ?? null;
  // Normalise to uppercase for consistent comparisons
  const roleUpper = (role ?? "").toUpperCase();

  return {
    /** The current user's role */
    role,

    /** Check a single permission */
    can: (permission: Permission) => can(role, permission),

    /** Check multiple permissions — all must match */
    canAll: (permissions: Permission[]) => canAll(role, permissions),

    /** Check multiple permissions — at least one must match */
    canAny: (permissions: Permission[]) => canAny(role, permissions),

    /** True for ADMIN and SUPER_ADMIN */
    isAdmin: roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN",

    /** True for AFFILIATE role */
    isAffiliate: roleUpper === "AFFILIATE",

    /** True for SELLER / business role */
    isBusiness: roleUpper === "SELLER" || roleUpper === "BUSINESS",

    /** True for any authenticated user */
    isAuthenticated: !!user,
  };
}
