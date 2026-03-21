export interface AdminRole {
  id: number;
  name: string;
  display_name: string;
  description: string;
  level: number;
  permissions: string[];
  is_active: boolean;
  can_manage_lower_levels: boolean;
  created_at: string;
  updated_at: string;
  permission_details: Array<{
    key: string;
    description: string;
    category: string;
  }>;
}

export interface AdminProfile {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  role: number;
  role_name: string;
  role_level: number;
  employee_id: string;
  department: string;
  managed_by?: number;
  manager_name?: string;
  permissions_override: string[];
  restricted_permissions: string[];
  effective_permissions: string[];
  is_active: boolean;
  is_suspended: boolean;
  last_login_ip?: string;
  last_login_time?: string;
  session_timeout_minutes: number;
  require_mfa: boolean;
  created_at: string;
  updated_at: string;
  suspended_at?: string;
  suspension_reason?: string;
}

export interface AdminActivityLog {
  id: number;
  admin_user: number;
  admin_user_email: string;
  admin_user_name: string;
  action: string;
  action_display: string;
  resource_type: string;
  resource_id: string;
  description: string;
  old_values?: any;
  new_values?: any;
  ip_address: string;
  user_agent: string;
  session_id?: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
  risk_level: 'low' | 'medium' | 'high' | 'urgent';
  requires_review: boolean;
  reviewed_by?: number;
  reviewed_by_name?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface AdminSession {
  id: number;
  admin_user: number;
  admin_user_email: string;
  admin_user_name: string;
  session_key: string;
  ip_address: string;
  user_agent: string;
  started_at: string;
  last_activity: string;
  expires_at: string;
  is_active: boolean;
  ended_at?: string;
  end_reason?: string;
  duration_minutes: number;
  is_expired: boolean;
}

export interface AdminPermissionOverride {
  id: number;
  admin_profile: number;
  admin_user_email: string;
  permission_key: string;
  permission_description: string;
  granted_by: number;
  granted_by_name: string;
  granted_at: string;
  expires_at: string;
  reason: string;
  is_active: boolean;
  revoked_at?: string;
  revoked_by?: number;
  revoked_by_name?: string;
  revoke_reason?: string;
  is_valid: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  user_type: number;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  is_verified: boolean;
  phone?: string;
  date_joined: string;
  last_login?: string;
  admin_profile?: AdminProfile;
  is_admin: boolean;
  admin_level?: number;
}

export interface PermissionOverview {
  user_permissions: string[];
  all_permissions: Array<{
    key: string;
    description: string;
    category: string;
    has_permission: boolean;
  }>;
  user_role: string;
  user_level: number;
}

export interface AccessibleAdmin {
  id: number;
  email: string;
  name: string;
  role: string;
  level: number;
  is_active: boolean;
  last_login?: string;
  employee_id: string;
}

export interface AdminStats {
  total_activities: number;
  activities_by_action: Record<string, number>;
  activities_by_admin: Record<string, number>;
  recent_activities: number;
  high_risk_activities: number;
  pending_review: number;
}

// Permission categories
export const PERMISSION_CATEGORIES = {
  user_management: 'User Management',
  admin_management: 'Admin Management',
  compliance: 'Compliance',
  transactions: 'Transactions',
  merchant_management: 'Merchant Management',
  support: 'Support',
  analytics: 'Analytics',
  system: 'System',
  verification: 'Verification',
  audit: 'Audit',
  emergency: 'Emergency'
} as const;

// Risk levels
export const RISK_LEVELS = {
  low: { label: 'Low', color: 'green' },
  medium: { label: 'Medium', color: 'yellow' },
  high: { label: 'High', color: 'orange' },
  urgent: { label: 'Urgent', color: 'red' }
} as const;

// Admin level colors
export const ADMIN_LEVEL_COLORS = {
  1: 'purple', // Super Admin
  2: 'blue',  // Business Admin
  3: 'green', // Operations Admin
  4: 'orange', // Verification Admin
  5: 'gray',  // Merchant
  6: 'gray'   // Customer
} as const;

// Admin level labels
export const ADMIN_LEVEL_LABELS = {
  1: 'Super Admin',
  2: 'Business Admin',
  3: 'Operations Admin',
  4: 'Verification Admin',
  5: 'Merchant',
  6: 'Customer'
} as const;
