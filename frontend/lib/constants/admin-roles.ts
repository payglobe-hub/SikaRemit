/**
 * Centralized admin role definitions for consistency across the application
 */

export const ADMIN_ROLES = [
  'super_admin',
  'business_admin', 
  'operations_admin',
  'verification_admin',
  'admin' // Legacy admin role for backward compatibility
] as const;

export type AdminRole = typeof ADMIN_ROLES[number];

export const isAdminRole = (role: string): boolean => {
  return ADMIN_ROLES.includes(role as AdminRole);
};

export const getAdminRedirectPath = (role: string): string => {
  // All admin roles redirect to admin overview by default
  // In the future, this could be expanded for role-specific redirects
  return '/admin/overview';
};
