// B2B Types
import { User } from './index';
export interface BusinessAccount {
  id: string;
  business_name: string;
  account_type: 'enterprise' | 'corporate' | 'sme' | 'government' | 'ngo';
  account_tier: 'starter' | 'professional' | 'enterprise' | 'custom';
  registration_number?: string;
  tax_id?: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  primary_contact: User;
  industry?: string;
  employee_count?: number;
  annual_revenue?: number;
  is_active: boolean;
  compliance_status: 'approved' | 'pending' | 'rejected' | 'under_review';
  credit_limit: number;
  payment_terms: string;
  total_users: number;
  active_users: number;
  roles: BusinessRole[];
  approval_workflows: ApprovalWorkflow[];
  created_at: string;
  updated_at: string;
  activated_at?: string;
}

export interface BusinessRole {
  id: string;
  name: string;
  role_type: 'owner' | 'admin' | 'manager' | 'accountant' | 'approver' | 'employee' | 'viewer';
  can_create_payments: boolean;
  can_approve_payments: boolean;
  can_manage_users: boolean;
  can_view_reports: boolean;
  can_manage_settings: boolean;
  single_transaction_limit: number;
  daily_limit: number;
  monthly_limit: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUser {
  id: string;
  user: User;
  role: BusinessRole;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  invited_at: string;
  joined_at?: string;
  employee_id?: string;
  department?: string;
  position?: string;
}

export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  workflow_type: 'sequential' | 'parallel' | 'hierarchical';
  min_amount: number;
  max_amount: number;
  requires_dual_approval: boolean;
  required_roles: BusinessRole[];
  required_approvers: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkPayment {
  id: string;
  name: string;
  description?: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' | 'cancelled';
  approval_workflow?: ApprovalWorkflow;
  approved_by: User[];
  approved_at?: string;
  processed_at?: string;
  completed_at?: string;
  reference_number: string;
  notes?: string;
  csv_file?: string;
  created_by: User;
  payment_items: BulkPaymentItem[];
  created_at: string;
  updated_at: string;
}

export interface BulkPaymentItem {
  id: string;
  recipient_name: string;
  recipient_phone?: string;
  recipient_email?: string;
  recipient_account?: string;
  amount: number;
  description?: string;
  payment_method: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transaction_id?: string;
  processed_at?: string;
  failure_reason?: string;
  reference: string;
  custom_fields: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BusinessAnalytics {
  total_payments: number;
  total_volume: number;
  average_transaction: number;
  monthly_volume: number;
  monthly_transactions: number;
  active_users: number;
  total_users: number;
  failed_payments: number;
  high_value_transactions: number;
  last_updated: string;
}

export interface AccountingIntegration {
  integration_type: 'quickbooks' | 'xero' | 'sage' | 'freshbooks' | 'wave' | 'custom';
  is_enabled: boolean;
  company_id?: string;
  base_url?: string;
  sync_frequency: string;
  sync_payments: boolean;
  sync_customers: boolean;
  sync_invoices: boolean;
  last_sync?: string;
  sync_status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// B2B API Request/Response Types
export interface CreateBusinessAccountRequest {
  business_name: string;
  account_type: BusinessAccount['account_type'];
  registration_number?: string;
  tax_id?: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  industry?: string;
  employee_count?: number;
  annual_revenue?: number;
}

export interface CreateBulkPaymentRequest {
  name: string;
  description?: string;
  currency: string;
  approval_workflow_id?: string;
  payment_items: Array<{
    recipient_name: string;
    recipient_phone?: string;
    recipient_email?: string;
    recipient_account?: string;
    amount: number;
    description?: string;
    payment_method: string;
    custom_fields?: Record<string, any>;
  }>;
}

export interface BulkPaymentValidationResponse {
  is_valid: boolean;
  errors: string[];
  total_amount: number;
  estimated_fees: number;
  estimated_completion_time: string;
}

// B2B Service Interfaces
export interface B2BService {
  // Business Account Management
  createBusinessAccount(data: CreateBusinessAccountRequest): Promise<BusinessAccount>;
  getBusinessAccount(id: string): Promise<BusinessAccount>;
  updateBusinessAccount(id: string, data: Partial<BusinessAccount>): Promise<BusinessAccount>;
  activateBusinessAccount(id: string): Promise<void>;

  // User Management
  inviteUser(accountId: string, email: string, roleId: string): Promise<void>;
  removeUser(accountId: string, userId: string): Promise<void>;
  updateUserRole(accountId: string, userId: string, roleId: string): Promise<void>;

  // Bulk Payments
  createBulkPayment(data: CreateBulkPaymentRequest): Promise<BulkPayment>;
  validateBulkPayment(items: CreateBulkPaymentRequest['payment_items']): Promise<BulkPaymentValidationResponse>;
  submitBulkPaymentForApproval(paymentId: string): Promise<void>;
  approveBulkPayment(paymentId: string): Promise<void>;
  processBulkPayment(paymentId: string): Promise<void>;
  getBulkPayments(accountId: string): Promise<BulkPayment[]>;

  // Approval Workflows
  createApprovalWorkflow(accountId: string, workflow: Omit<ApprovalWorkflow, 'id' | 'created_at' | 'updated_at'>): Promise<ApprovalWorkflow>;
  getApprovalWorkflows(accountId: string): Promise<ApprovalWorkflow[]>;

  // Analytics
  getBusinessAnalytics(accountId: string): Promise<BusinessAnalytics>;

  // Accounting Integration
  setupAccountingIntegration(accountId: string, integration: Omit<AccountingIntegration, 'id' | 'created_at' | 'updated_at'>): Promise<AccountingIntegration>;
  testAccountingConnection(integrationId: string): Promise<{ success: boolean; message: string }>;
  syncAccountingData(integrationId: string): Promise<void>;
}
