import api from './axios';

export interface MerchantDashboard {
  overview: {
    total_revenue: number;
    revenue_growth: number;
    total_transactions: number;
    transaction_growth: number;
    pending_payouts: number;
    active_stores: number;
  };
  revenue_by_period: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
  recent_transactions: Array<{
    id: string;
    amount: number;
    status: string;
    customer: string;
    date: string;
  }>;
  top_products: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export interface MerchantCustomer {
  id: number;
  merchant: {
    id: number;
    business_name: string;
    user: {
      id: number;
      email: string;
    };
  };
  customer: {
    id: number;
    user: {
      id: number;
      email: string;
      first_name: string;
      last_name: string;
    };
    kyc_verified: boolean;
  };
  onboarded_at: string;
  status: 'active' | 'suspended' | 'blocked';
  kyc_required: boolean;
  kyc_status: 'not_required' | 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  kyc_completed_at?: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  notes: string;
  days_since_onboarded: number;
  latest_kyc_submission?: MerchantKYCSubmission;
}

export interface MerchantKYCSubmission {
  id: number;
  merchant_customer: MerchantCustomer;
  kyc_document: {
    id: number;
    document_type: string;
    status: string;
    uploaded_at: string;
  };
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  review_priority: 'low' | 'normal' | 'high' | 'urgent';
  reviewed_by?: {
    id: number;
    email: string;
  };
  reviewed_at?: string;
  admin_notes: string;
  days_pending: number;
}

export interface MerchantCustomerStats {
  total_customers: number;
  active_customers: number;
  suspended_customers: number;
  kyc_pending: number;
  kyc_approved: number;
  kyc_rejected: number;
  recent_onboardings: number;
}

export async function getMerchant(merchantId?: string) {
  const endpoint = merchantId 
    ? `/api/v1/merchants/${merchantId}/` 
    : '/api/v1/merchants/profile/';
  const response = await api.get(endpoint);
  return response.data;
}

export async function getMerchantOnboardingStatus(): Promise<{
  status: 'pending' | 'business_info' | 'bank_details' | 'verification' | 'completed';
  current_step: number;
  total_steps: number;
  data: any;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}> {
  const response = await api.get('/api/v1/merchants/onboarding/');
  return response.data;
}

export async function updateMerchantOnboarding(data: any): Promise<{
  status: string;
  current_step: number;
  total_steps: number;
  data: any;
  is_verified: boolean;
  message: string;
}> {
  const response = await api.post('/api/v1/merchants/onboarding/', data);
  return response.data;
}

export async function uploadVerificationDocument(data: {
  document_type: string;
  document_file: File;
}): Promise<{ status: string; message: string }> {
  const formData = new FormData();
  formData.append('document_type', data.document_type);
  formData.append('document_file', data.document_file);

  const response = await api.post('/api/v1/merchants/onboarding/verify/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function getMerchantDashboard(): Promise<MerchantDashboard> {
  const response = await api.get('/api/v1/merchants/dashboard/');
  return response.data;
}

export async function getMerchantStores() {
  const response = await api.get('/api/v1/merchants/stores/');
  return response.data;
}

export async function getMerchantProducts() {
  const response = await api.get('/api/v1/merchants/products/');
  return response.data;
}

export async function getMerchantTransactions() {
  const response = await api.get('/api/v1/merchants/transactions/simple/');
  return response.data.transactions || [];
}

export interface MerchantTransactionStats {
  total_volume: number;
  success_rate: number;
  average_transaction: number;
  processing_count: number;
  total_transactions: number;
  completed_count: number;
  failed_count: number;
  pending_count: number;
}

export async function getMerchantTransactionStats(): Promise<MerchantTransactionStats> {
  const response = await api.get('/api/v1/merchants/transactions/stats/');
  return response.data;
}

export async function getMerchantPayouts() {
  const response = await api.get('/api/v1/accounts/merchant/payouts/');
  return response.data;
}

// Merchant notification functions
export async function getMerchantNotifications() {
  const response = await api.get('/api/v1/merchants/notifications/');
  return response.data;
}

export async function markMerchantNotificationAsRead(notificationId: string) {
  const response = await api.patch(`/api/v1/merchants/notifications/${notificationId}/read/`, {});
  return response.data;
}

export async function markAllMerchantNotificationsAsRead() {
  const response = await api.post('/api/v1/merchants/notifications/mark-all-read/', {});
  return response.data;
}

export async function getMerchantNotificationSettings() {
  const response = await api.get('/api/v1/merchants/notification-settings/');
  return response.data;
}

export async function updateMerchantNotificationSettings(settings: any) {
  const response = await api.patch('/api/v1/merchants/notification-settings/', settings);
  return response.data;
}

// Merchant invoice functions
export async function getMerchantInvoices() {
  try {
    const response = await api.get('/api/v1/merchants/invoices/');
    return response.data;
  } catch (error) {
    return []
  }
}

export async function createMerchantInvoice(data: any) {
  const response = await api.post('/api/v1/merchants/invoices/', data);
  return response.data;
}

export async function sendMerchantInvoice(invoiceId: string) {
  const response = await api.post(`/api/v1/merchants/invoices/${invoiceId}/send/`, {});
  return response.data;
}

export async function downloadMerchantInvoice(invoiceId: string) {
  const response = await api.get(`/api/v1/merchants/invoices/${invoiceId}/download/`, {
    responseType: 'blob'
  });
  return response.data;
}

// Receipt functions
export async function generateReceipt(transactionId: string) {
  const response = await api.post(`/api/v1/merchants/receipts/generate/`, {
    transaction_id: transactionId
  });
  return response.data;
}

export async function downloadReceipt(receiptId: string) {
  const response = await api.get(`/api/v1/merchants/receipts/${receiptId}/download/`, {
    responseType: 'blob'
  });
  return response.data;
}

export async function verifyWebhook(signature: string, payload: any) {
  const response = await api.post('/api/v1/merchants/webhooks/verify/', {
    signature,
    payload
  });
  return response.data;
}

export async function emailReceipt(receiptId: string, email: string) {
  const response = await api.post(`/api/v1/merchants/receipts/${receiptId}/email/`, {
    email
  });
  return response.data;
}

// Merchant Customer Management Functions
export async function getMerchantCustomers(params?: {
  status?: string;
  kyc_status?: string;
  search?: string;
  page?: number;
}): Promise<{ results: MerchantCustomer[]; count: number }> {
  const response = await api.get('/api/v1/users/merchant-customers/', { params });
  return response.data;
}

export async function onboardMerchantCustomer(customerId: number, data: {
  kyc_required?: boolean;
  notes?: string;
}): Promise<MerchantCustomer> {
  const response = await api.post('/api/v1/users/merchant-customers/onboard/', {
    customer_id: customerId,
    ...data
  });
  return response.data;
}

export async function getMerchantCustomer(customerId: number): Promise<MerchantCustomer> {
  const response = await api.get(`/api/v1/users/merchant-customers/${customerId}/`);
  return response.data;
}

export async function updateMerchantCustomer(customerId: number, data: Partial<MerchantCustomer>): Promise<MerchantCustomer> {
  const response = await api.patch(`/api/v1/users/merchant-customers/${customerId}/`, data);
  return response.data;
}

export async function submitMerchantCustomerKYC(customerId: number, data: {
  document_type: string;
  document_file: File;
  auto_escalate?: boolean;
}): Promise<MerchantKYCSubmission> {
  const formData = new FormData();
  formData.append('document_type', data.document_type);
  formData.append('document_file', data.document_file);
  if (data.auto_escalate !== undefined) {
    formData.append('auto_escalate', data.auto_escalate.toString());
  }

  const response = await api.post(`/api/v1/users/merchant-customers/${customerId}/submit_kyc/`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function getMerchantCustomerKYCStatus(customerId: number): Promise<{
  merchant_customer: MerchantCustomer;
  kyc_status: string;
  is_active: boolean;
  kyc_passed: boolean;
  needs_admin_review: boolean;
  risk_score: number;
  submissions: MerchantKYCSubmission[];
  latest_submission?: MerchantKYCSubmission;
}> {
  const response = await api.get(`/api/v1/users/merchant-customers/${customerId}/kyc_status/`);
  return response.data;
}

export async function suspendMerchantCustomer(customerId: number, reason: string): Promise<MerchantCustomer> {
  const response = await api.post(`/api/v1/users/merchant-customers/${customerId}/suspend/`, {
    reason
  });
  return response.data;
}

export async function activateMerchantCustomer(customerId: number): Promise<MerchantCustomer> {
  const response = await api.post(`/api/v1/users/merchant-customers/${customerId}/activate/`);
  return response.data;
}

export async function getMerchantCustomerStats(): Promise<MerchantCustomerStats> {
  const response = await api.get('/api/v1/users/merchant-customers/test-stats/');
  return response.data;
}

// Report Types
export interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  report_type: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface MerchantReport {
  id: number;
  template: number;
  template_name: string;
  name: string;
  description: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  format: 'pdf' | 'csv' | 'excel' | 'json';
  start_date: string;
  end_date: string;
  filters: Record<string, any>;
  file_url?: string;
  file_size?: number;
  record_count: number;
  processing_time?: string;
  error_message?: string;
  is_scheduled: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  duration_days: number;
  merchant_name: string;
}

export interface ScheduledReport {
  id: number;
  template: number;
  template_name: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  next_run: string;
  last_run?: string;
  format: 'pdf' | 'csv' | 'excel' | 'json';
  filters: Record<string, any>;
  email_recipients: string[];
  status: 'active' | 'paused' | 'expired';
  is_active: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  merchant_name: string;
}

export interface ReportGenerationParams {
  template: number;
  name?: string;
  description?: string;
  format?: 'pdf' | 'csv' | 'excel' | 'json';
  start_date: string;
  end_date: string;
  filters?: Record<string, any>;
}

export interface ScheduledReportCreateParams {
  template: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format?: 'pdf' | 'csv' | 'excel' | 'json';
  filters?: Record<string, any>;
  email_recipients?: string[];
}

// Report API Functions
export async function getReportTemplates(): Promise<ReportTemplate[]> {
  const response = await api.get('/api/v1/merchants/report-templates/');
  return response.data;
}

export async function getMerchantReports(): Promise<MerchantReport[]> {
  const response = await api.get('/api/v1/merchants/reports/');
  const data = response.data;
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data && data.results && Array.isArray(data.results)) {
    return data.results;
  } else {
    // Return empty array for any other format (including empty objects)
    return [];
  }
}

export async function createMerchantReport(params: ReportGenerationParams): Promise<MerchantReport> {
  const response = await api.post('/api/v1/merchants/reports/generate/', params);
  return response.data;
}

export async function getMerchantReport(reportId: number): Promise<MerchantReport> {
  const response = await api.get(`/api/v1/merchants/reports/${reportId}/`);
  return response.data;
}

export async function regenerateReport(reportId: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/merchants/reports/${reportId}/regenerate/`);
  return response.data;
}

export async function cancelReport(reportId: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/merchants/reports/${reportId}/cancel/`);
  return response.data;
}

export async function deleteReport(reportId: number): Promise<void> {
  await api.delete(`/api/v1/merchants/reports/${reportId}/`);
}

export async function downloadReport(reportId: number): Promise<Blob> {
  const response = await api.get(`/api/v1/merchants/reports/${reportId}/download/`, {
    responseType: 'blob'
  });
  return new Blob([response.data]);
}

export async function generateReport(params: {
  template: number;
  start_date: string;
  end_date: string;
  format?: 'pdf' | 'csv' | 'excel' | 'json';
}): Promise<MerchantReport> {
  const response = await api.get('/api/v1/merchants/reports/generate/', { params });
  return response.data;
}

// Scheduled Reports API Functions
export async function getScheduledReports(): Promise<ScheduledReport[]> {
  const response = await api.get('/api/v1/merchants/scheduled-reports/');
  const data = response.data;
  
  // Handle different response formats
  if (Array.isArray(data)) {
    return data;
  } else if (data && data.results && Array.isArray(data.results)) {
    return data.results;
  } else {
    // Return empty array for any other format (including empty objects)
    return [];
  }
}

export async function createScheduledReport(params: ScheduledReportCreateParams): Promise<ScheduledReport> {
  const response = await api.post('/api/v1/merchants/scheduled-reports/', params);
  return response.data;
}

export async function getScheduledReport(scheduledReportId: number): Promise<ScheduledReport> {
  const response = await api.get(`/api/v1/merchants/scheduled-reports/${scheduledReportId}/`);
  return response.data;
}

export async function updateScheduledReport(
  scheduledReportId: number,
  params: Partial<ScheduledReportCreateParams>
): Promise<ScheduledReport> {
  const response = await api.patch(`/api/v1/merchants/scheduled-reports/${scheduledReportId}/`, params);
  return response.data;
}

export async function deleteScheduledReport(scheduledReportId: number): Promise<void> {
  await api.delete(`/api/v1/merchants/scheduled-reports/${scheduledReportId}/`);
}

export async function pauseScheduledReport(scheduledReportId: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/merchants/scheduled-reports/${scheduledReportId}/pause/`);
  return response.data;
}

export async function resumeScheduledReport(scheduledReportId: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/merchants/scheduled-reports/${scheduledReportId}/resume/`);
  return response.data;
}

export async function runScheduledReportNow(scheduledReportId: number): Promise<{ message: string; report: MerchantReport }> {
  const response = await api.post(`/api/v1/merchants/scheduled-reports/${scheduledReportId}/run_now/`);
  return response.data;
}

// Merchant Invitation API Functions
export interface MerchantInvitation {
  id: string;
  business_name: string;
  business_email: string;
  contact_person: string;
  phone_number: string;
  business_type: string;
  business_registration_number?: string;
  business_address: string;
  city: string;
  country: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  invitation_link: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  cancelled_at?: string;
  created_by: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface MerchantApplication {
  id: string;
  business_name: string;
  business_email: string;
  contact_person: string;
  phone_number: string;
  business_type: string;
  business_registration_number?: string;
  business_address: string;
  city: string;
  country: string;
  status: 'pending' | 'approved' | 'rejected';
  documents: Array<{
    id: string;
    document_type: string;
    file_name: string;
    uploaded_at: string;
  }>;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  rejection_reason?: string;
}

export async function getInvitations(params?: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<{ results: MerchantInvitation[]; count: number }> {
  const response = await api.get('/api/v1/admin/merchants/invitations/', { params });
  return response.data;
}

export async function getApplications(params?: {
  status?: string;
  search?: string;
  page?: number;
}): Promise<{ results: MerchantApplication[]; count: number }> {
  const response = await api.get('/api/v1/admin/merchants/applications/', { params });
  return response.data;
}

export async function createInvitation(data: {
  business_name: string;
  business_email: string;
  contact_person: string;
  phone_number: string;
  business_type: string;
  business_registration_number?: string;
  business_address: string;
  city: string;
  country: string;
}): Promise<MerchantInvitation> {
  const response = await api.post('/api/v1/admin/merchants/invitations/', data);
  return response.data;
}

export async function resendInvitation(invitationId: string): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/admin/merchants/invitations/${invitationId}/resend/`);
  return response.data;
}

export async function cancelInvitation(invitationId: string, reason?: string): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/admin/merchants/invitations/${invitationId}/cancel/`, { reason });
  return response.data;
}

export async function getInvitation(invitationId: string): Promise<MerchantInvitation> {
  const response = await api.get(`/api/v1/admin/merchants/invitations/${invitationId}/`);
  return response.data;
}

export async function getApplication(applicationId: string): Promise<MerchantApplication> {
  const response = await api.get(`/api/v1/admin/merchants/applications/${applicationId}/`);
  return response.data;
}

export async function approveApplication(applicationId: string, notes?: string): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/admin/merchants/applications/${applicationId}/approve/`, { notes });
  return response.data;
}

export async function rejectApplication(applicationId: string, reason: string): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/admin/merchants/applications/${applicationId}/reject/`, { reason });
  return response.data;
}

export async function getInvitationStats(): Promise<{
  total_invitations: number;
  pending_invitations: number;
  accepted_invitations: number;
  expired_invitations: number;
  cancelled_invitations: number;
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
}> {
  const response = await api.get('/api/v1/admin/merchants/stats/');
  return response.data;
}
