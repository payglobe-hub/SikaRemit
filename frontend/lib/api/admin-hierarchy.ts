import api from './axios';
import { 
  AdminRole, 
  AdminProfile, 
  AdminActivityLog, 
  AdminSession, 
  AdminPermissionOverride,
  AdminUser,
  PermissionOverview,
  AccessibleAdmin,
  AdminStats,
  ADMIN_LEVEL_LABELS,
  ADMIN_LEVEL_COLORS,
  RISK_LEVELS
} from '../types/admin';

// Re-export types for convenience
export type {
  AdminRole,
  AdminProfile,
  AdminActivityLog,
  AdminSession,
  AdminPermissionOverride,
  AdminUser,
  PermissionOverview,
  AccessibleAdmin,
  AdminStats
};

// Re-export constants
export { ADMIN_LEVEL_LABELS, ADMIN_LEVEL_COLORS, RISK_LEVELS };

// Admin Role API
export async function getAdminRoles(): Promise<AdminRole[]> {
  const response = await api.get('/api/v1/users/admin/roles/');
  return response.data;
}

export async function createAdminRole(data: Partial<AdminRole>): Promise<AdminRole> {
  const response = await api.post('/api/v1/users/admin/roles/', data);
  return response.data;
}

export async function updateAdminRole(id: number, data: Partial<AdminRole>): Promise<AdminRole> {
  const response = await api.patch(`/api/v1/users/admin/roles/${id}/`, data);
  return response.data;
}

export async function activateAdminRole(id: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/roles/${id}/activate/`);
  return response.data;
}

export async function deactivateAdminRole(id: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/roles/${id}/deactivate/`);
  return response.data;
}

// Admin Profile API
export async function getAdminProfiles(params?: {
  role?: string;
  level?: number;
  is_active?: boolean;
  search?: string;
}): Promise<AdminProfile[]> {
  const response = await api.get('/api/v1/users/admin/profiles/', { params });
  return response.data;
}

export async function getAdminProfile(id: number): Promise<AdminProfile> {
  const response = await api.get(`/api/v1/users/admin/profiles/${id}/`);
  return response.data;
}

export async function createAdminProfile(data: Partial<AdminProfile>): Promise<AdminProfile> {
  const response = await api.post('/api/v1/users/admin/profiles/', data);
  return response.data;
}

export async function updateAdminProfile(id: number, data: Partial<AdminProfile>): Promise<AdminProfile> {
  const response = await api.patch(`/api/v1/users/admin/profiles/${id}/`, data);
  return response.data;
}

export async function suspendAdmin(id: number, reason: string): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/profiles/${id}/suspend/`, { reason });
  return response.data;
}

export async function activateAdmin(id: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/profiles/${id}/activate/`);
  return response.data;
}

export async function getAdminPermissions(id: number): Promise<{
  permissions: string[];
  role: string;
  level: number;
}> {
  const response = await api.get(`/api/v1/users/admin/profiles/${id}/permissions/`);
  return response.data;
}

export async function grantPermissionOverride(id: number, permission: string, expiresHours: number = 24, reason: string = 'Temporary access granted'): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/profiles/${id}/grant_permission_override/`, {
    permission,
    expires_hours: expiresHours,
    reason
  });
  return response.data;
}

// Admin Activity Log API
export async function getAdminActivityLogs(params?: {
  admin_id?: number;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
}): Promise<AdminActivityLog[]> {
  const response = await api.get('/api/v1/users/admin/activity-logs/', { params });
  return response.data;
}

export async function getAdminActivityLog(id: number): Promise<AdminActivityLog> {
  const response = await api.get(`/api/v1/users/admin/activity-logs/${id}/`);
  return response.data;
}

export async function markActivityLogReviewed(id: number, notes: string = ''): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/activity-logs/${id}/mark_reviewed/`, { notes });
  return response.data;
}

export async function getActivityLogStatistics(params?: {
  recent_days?: number;
}): Promise<AdminStats> {
  const response = await api.get('/api/v1/users/admin/activity-logs/statistics/', { params });
  return response.data;
}

// Admin Session API
export async function getAdminSessions(params?: {
  admin_id?: number;
  is_active?: boolean;
}): Promise<AdminSession[]> {
  const response = await api.get('/api/v1/users/admin/sessions/', { params });
  return response.data;
}

export async function getAdminSession(id: number): Promise<AdminSession> {
  const response = await api.get(`/api/v1/users/admin/sessions/${id}/`);
  return response.data;
}

export async function terminateAdminSession(id: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/users/admin/sessions/${id}/terminate/`);
  return response.data;
}

export async function cleanupExpiredSessions(): Promise<{ message: string; cleaned_count: number }> {
  const response = await api.post('/api/v1/users/admin/sessions/cleanup_expired/');
  return response.data;
}

// Permission Overview API
export async function getPermissionOverview(): Promise<PermissionOverview> {
  try {
    
    const response = await api.get('/api/v1/users/admin/permissions-overview/');
    
    return response.data;
  } catch (error: any) {

    // Return fallback permission data with correct type
    const fallbackData: PermissionOverview = {
      user_permissions: [],
      all_permissions: [],
      user_role: 'unknown',
      user_level: 0
    };

    return fallbackData;
  }
}

// Accessible Admins API
export async function getAccessibleAdmins(): Promise<{
  accessible_admins: AccessibleAdmin[];
  count: number;
}> {
  const response = await api.get('/api/v1/users/admin/accessible-admins/');
  return response.data;
}

// User Management API
export async function getAdminUsers(params?: {
  role?: string;
  level?: number;
  is_active?: boolean;
  search?: string;
}): Promise<AdminUser[]> {
  const response = await api.get('/admin/admin-management/admin/users/', { params });
  return response.data;
}

export async function createAdminUser(data: {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  confirm_password: string;
  phone?: string;
  user_type: number;
}): Promise<AdminUser> {
  const response = await api.post('/admin/admin-management/admin/users/', data);
  return response.data;
}

export async function updateAdminUser(id: number, data: Partial<AdminUser>): Promise<AdminUser> {
  const response = await api.patch(`/admin/admin-management/admin/users/${id}/`, data);
  return response.data;
}

export async function suspendAdminUser(id: number, reason: string): Promise<{ message: string }> {
  const response = await api.post(`/admin/admin-management/admin/users/${id}/suspend/`, { reason });
  return response.data;
}

export async function activateAdminUser(id: number): Promise<{ message: string }> {
  const response = await api.post(`/admin/admin-management/admin/users/${id}/activate/`);
  return response.data;
}

// Permission Override API
export async function getPermissionOverrides(adminId?: number): Promise<AdminPermissionOverride[]> {
  const url = adminId 
    ? `/admin/admin-management/admin/permission-overrides/?admin_profile=${adminId}`
    : '/admin/admin-management/admin/permission-overrides/';
  const response = await api.get(url);
  return response.data;
}

export async function revokePermissionOverride(id: number, reason?: string): Promise<{ message: string }> {
  const response = await api.post(`/admin/admin-management/admin/permission-overrides/${id}/revoke/`, { reason });
  return response.data;
}

// Utility functions
export function getAdminLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    1: 'Super Admin',
    2: 'Business Admin',
    3: 'Operations Admin',
    4: 'Verification Admin',
    5: 'Merchant',
    6: 'Customer'
  };
  return labels[level] || 'Unknown';
}

export function getAdminLevelColor(level: number): string {
  const colors: Record<number, string> = {
    1: 'purple',
    2: 'blue',
    3: 'green',
    4: 'orange',
    5: 'gray',
    6: 'gray'
  };
  return colors[level] || 'gray';
}

export function getRiskLevelColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    urgent: 'red'
  };
  return colors[riskLevel] || 'gray';
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
}

export function getPermissionCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    user_management: '👥',
    admin_management: '👔',
    compliance: '⚖️',
    transactions: '💳',
    merchant_management: '🏪',
    support: '💬',
    analytics: '📊',
    system: '⚙️',
    verification: '✅',
    audit: '🔍',
    emergency: '🚨'
  };
  return icons[category] || '📋';
}
