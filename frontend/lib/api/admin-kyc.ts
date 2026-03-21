import api from './axios';

export interface MerchantKYCSubmission {
  id: number;
  merchant_customer: {
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
    };
    onboarded_at: string;
    status: 'active' | 'suspended' | 'blocked';
    kyc_status: string;
    risk_score: number;
  };
  kyc_document: {
    id: number;
    document_type: string;
    status: string;
    uploaded_at: string;
    front_image?: string;
    back_image?: string;
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
  escalation_reason: string;
  risk_score: number;
  risk_factors: string[];
  compliance_flags: string[];
  days_pending: number;
}

export interface KYCSubmissionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  priority_breakdown: Array<{
    review_priority: string;
    count: number;
  }>;
}

export interface AdminKYCInboxItem {
  id: string;
  subject_type: 'merchant_customer' | 'direct_customer';
  source_id: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  submitted_at: string;
  review_priority: 'low' | 'normal' | 'high' | 'urgent' | null;
  risk_score: number;
  risk_factors: string[];
  escalation_reason: string;
  merchant_customer: MerchantKYCSubmission['merchant_customer'] | null;
  customer: {
    id: number;
    user: {
      id: number;
      email: string;
      first_name?: string;
      last_name?: string;
    };
    kyc_status?: string;
  } | null;
  kyc_document: MerchantKYCSubmission['kyc_document'] | KYCDocument;
  reviewed_by: MerchantKYCSubmission['reviewed_by'] | UserRef | null;
  reviewed_at?: string | null;
  admin_notes: string;
  days_pending?: number | null;
}

export interface UserRef {
  id: number;
  email: string;
}

export interface KYCDocument {
  id: number;
  document_type: string;
  status: string;
  front_image?: string;
  back_image?: string;
}

export interface AdminKYCInboxResponse {
  results: AdminKYCInboxItem[];
  count: number;
}

export interface AdminKYCInboxStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  by_subject: {
    merchant_customer: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      escalated: number;
    };
    direct_customer: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      escalated: number;
    };
  };
}

export interface BulkKYCDecision {
  submissions: Array<{
    id: number;
    decision: 'approved' | 'rejected' | 'escalated';
    admin_notes?: string;
  }>;
}

// Get KYC submissions for admin review
export async function getKYCSubmissions(params?: {
  status?: 'pending' | 'approved' | 'rejected' | 'escalated' | 'all';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  merchant_id?: number;
  days_pending?: number;
  page?: number;
}): Promise<{ results: MerchantKYCSubmission[]; count: number }> {
  const response = await api.get('/api/v1/users/merchant-kyc-submissions/', { params });
  return response.data;
}

export async function getAdminKYCInbox(params?: {
  status?: 'pending' | 'approved' | 'rejected' | 'escalated' | 'all';
  subject?: 'all' | 'merchant_customer' | 'direct_customer';
  page?: number;
  page_size?: number;
}): Promise<AdminKYCInboxResponse> {
  const response = await api.get('/api/v1/users/admin-kyc-inbox/', { params });
  return response.data;
}

export async function getAdminKYCInboxStats(): Promise<AdminKYCInboxStats> {
  const response = await api.get('/api/v1/users/admin-kyc-inbox/stats/');
  return response.data;
}

// Get single KYC submission details
export async function getKYCSubmission(submissionId: number): Promise<MerchantKYCSubmission> {
  const response = await api.get(`/api/v1/users/merchant-kyc-submissions/${submissionId}/`);
  return response.data;
}

// Approve KYC submission
export async function approveKYCSubmission(submissionId: number, notes?: string): Promise<MerchantKYCSubmission> {
  const response = await api.post(`/api/v1/users/merchant-kyc-submissions/${submissionId}/approve/`, {
    notes: notes || ''
  });
  return response.data;
}

// Reject KYC submission
export async function rejectKYCSubmission(submissionId: number, reason: string): Promise<MerchantKYCSubmission> {
  const response = await api.post(`/api/v1/users/merchant-kyc-submissions/${submissionId}/reject/`, {
    reason
  });
  return response.data;
}

// Escalate KYC submission
export async function escalateKYCSubmission(submissionId: number, notes?: string): Promise<MerchantKYCSubmission> {
  const response = await api.post(`/api/v1/users/merchant-kyc-submissions/${submissionId}/escalate/`, {
    notes: notes || ''
  });
  return response.data;
}

// Bulk process KYC decisions
export async function bulkProcessKYCDecisions(data: BulkKYCDecision): Promise<{
  results: Array<{
    success: boolean;
    submission_id: number;
    result?: MerchantKYCSubmission;
    error?: string;
  }>;
}> {
  const response = await api.post('/api/v1/users/merchant-kyc-submissions/bulk_decide/', data);
  return response.data;
}

// Get KYC submission statistics
export async function getKYCSubmissionStats(): Promise<KYCSubmissionStats> {
  const response = await api.get('/api/v1/users/merchant-kyc-submissions/stats/');
  return response.data;
}

export async function approveDirectCustomerKYCDocument(documentId: number): Promise<any> {
  const response = await api.post(`/api/v1/users/kyc-documents/${documentId}/approve/`, {});
  return response.data;
}

export async function rejectDirectCustomerKYCDocument(documentId: number, reason: string): Promise<any> {
  const response = await api.post(`/api/v1/users/kyc-documents/${documentId}/reject/`, { reason });
  return response.data;
}
