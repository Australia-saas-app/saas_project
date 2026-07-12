export type UserRole = "customer" | "rider" | "business" | "admin" | "sub_admin";

export type Permission = 
  // User permissions
  | "view_profile"
  | "edit_profile"
  // Business permissions
  | "manage_inventory"
  | "view_analytics"
  | "manage_bookings"
  // Admin permissions
  | "approve_kyc"
  | "manage_users"
  | "view_system_logs"
  | "manage_roles";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  customer: ["view_profile", "edit_profile"],
  rider: ["view_profile", "edit_profile", "manage_bookings"],
  business: ["view_profile", "edit_profile", "manage_inventory", "view_analytics", "manage_bookings"],
  sub_admin: ["view_profile", "edit_profile", "approve_kyc", "view_analytics"],
  admin: [
    "view_profile", "edit_profile", "manage_inventory", "view_analytics", 
    "manage_bookings", "approve_kyc", "manage_users", "view_system_logs", "manage_roles"
  ], // Admin has all
};

export const hasPermission = (role: UserRole | undefined, permission: Permission): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const hasAnyPermission = (role: UserRole | undefined, permissions: Permission[]): boolean => {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
};

export const hasAllPermissions = (role: UserRole | undefined, permissions: Permission[]): boolean => {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
};
