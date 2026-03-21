import api from './api';
import { ENDPOINTS } from '../constants/api';
import {
  BusinessAccount,
  BusinessRole,
  BusinessUser,
  ApprovalWorkflow,
  BulkPayment,
  BulkPaymentItem,
  BusinessAnalytics,
  AccountingIntegration,
  CreateBusinessAccountRequest,
  CreateBulkPaymentRequest,
  BulkPaymentValidationResponse,
  B2BService,
} from '../types/b2b';

class B2BServiceImpl implements B2BService {
  // Business Account Management
  async createBusinessAccount(data: CreateBusinessAccountRequest): Promise<BusinessAccount> {
    const response = await api.post(ENDPOINTS.MERCHANT?.BUSINESS_ACCOUNTS || '/merchants/business-accounts/', data);
    return response.data;
  }

  async getCurrentUserBusinessAccount(): Promise<BusinessAccount | null> {
    try {
      const response = await api.get(`${ENDPOINTS.MERCHANT?.BUSINESS_ACCOUNTS || '/merchants/business-accounts/'}my_account/`);
      return response.data;
    } catch (error: any) {
      // If no business account found, return null
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getBusinessAccount(id: string): Promise<BusinessAccount> {
    const response = await api.get(`${ENDPOINTS.MERCHANT?.BUSINESS_ACCOUNTS || '/merchants/business-accounts/'}${id}/`);
    return response.data;
  }

  async updateBusinessAccount(id: string, data: Partial<BusinessAccount>): Promise<BusinessAccount> {
    const response = await api.patch(`${ENDPOINTS.MERCHANT?.BUSINESS_ACCOUNTS || '/merchants/business-accounts/'}${id}/`, data);
    return response.data;
  }

  async activateBusinessAccount(id: string): Promise<void> {
    await api.post(`${ENDPOINTS.MERCHANT?.BUSINESS_ACCOUNTS || '/merchants/business-accounts/'}${id}/activate/`);
  }

  // User Management
  async inviteUser(accountId: string, email: string, roleId: string): Promise<void> {
    await api.post(`${ENDPOINTS.MERCHANT?.BUSINESS_USERS || '/merchants/business-users/'}`, {
      business_account: accountId,
      email,
      role: roleId,
    });
  }

  async removeUser(accountId: string, userId: string): Promise<void> {
    await api.delete(`${ENDPOINTS.MERCHANT?.BUSINESS_USERS || '/merchants/business-users/'}${userId}/`);
  }

  async updateUserRole(accountId: string, userId: string, roleId: string): Promise<void> {
    await api.patch(`${ENDPOINTS.MERCHANT?.BUSINESS_USERS || '/merchants/business-users/'}${userId}/`, {
      role: roleId,
    });
  }

  // Bulk Payments
  async createBulkPayment(data: CreateBulkPaymentRequest): Promise<BulkPayment> {
    const response = await api.post(ENDPOINTS.MERCHANT?.BULK_PAYMENTS || '/merchants/bulk-payments/', data);
    return response.data;
  }

  async validateBulkPayment(items: CreateBulkPaymentRequest['payment_items']): Promise<BulkPaymentValidationResponse> {
    const response = await api.post(
      `${ENDPOINTS.MERCHANT?.BULK_PAYMENTS || '/merchants/bulk-payments/'}validate/`,
      { payment_items: items }
    );
    return response.data;
  }

  async submitBulkPaymentForApproval(paymentId: string): Promise<void> {
    await api.post(`${ENDPOINTS.MERCHANT?.BULK_PAYMENTS || '/merchants/bulk-payments/'}${paymentId}/submit_for_approval/`);
  }

  async approveBulkPayment(paymentId: string): Promise<void> {
    await api.post(`${ENDPOINTS.MERCHANT?.BULK_PAYMENTS || '/merchants/bulk-payments/'}${paymentId}/approve/`);
  }

  async processBulkPayment(paymentId: string): Promise<void> {
    await api.post(`${ENDPOINTS.MERCHANT?.BULK_PAYMENTS || '/merchants/bulk-payments/'}${paymentId}/process/`);
  }

  async getBulkPayments(accountId: string): Promise<BulkPayment[]> {
    const response = await api.get(ENDPOINTS.MERCHANT?.BULK_PAYMENTS || '/merchants/bulk-payments/', {
      params: { business_account: accountId }
    });
    return response.data.results || response.data;
  }

  // Approval Workflows
  async createApprovalWorkflow(
    accountId: string,
    workflow: Omit<ApprovalWorkflow, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ApprovalWorkflow> {
    const response = await api.post(ENDPOINTS.MERCHANT?.APPROVAL_WORKFLOWS || '/merchants/approval-workflows/', {
      business_account: accountId,
      ...workflow,
    });
    return response.data;
  }

  async getApprovalWorkflows(accountId: string): Promise<ApprovalWorkflow[]> {
    const response = await api.get(ENDPOINTS.MERCHANT?.APPROVAL_WORKFLOWS || '/merchants/approval-workflows/', {
      params: { business_account: accountId }
    });
    return response.data.results || response.data;
  }

  // Analytics
  async getBusinessAnalytics(accountId: string): Promise<BusinessAnalytics> {
    const response = await api.get(`${ENDPOINTS.MERCHANT?.BUSINESS_ANALYTICS || '/merchants/business-analytics/'}`, {
      params: { business_account: accountId }
    });
    return response.data;
  }

  // Accounting Integration
  async setupAccountingIntegration(
    accountId: string,
    integration: Omit<AccountingIntegration, 'id' | 'created_at' | 'updated_at'>
  ): Promise<AccountingIntegration> {
    const response = await api.post(ENDPOINTS.MERCHANT?.ACCOUNTING_INTEGRATIONS || '/merchants/accounting-integrations/', {
      business_account: accountId,
      ...integration,
    });
    return response.data;
  }

  async testAccountingConnection(integrationId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(
      `${ENDPOINTS.MERCHANT?.ACCOUNTING_INTEGRATIONS || '/merchants/accounting-integrations/'}${integrationId}/test_connection/`
    );
    return response.data;
  }

  async syncAccountingData(integrationId: string): Promise<void> {
    await api.post(`${ENDPOINTS.MERCHANT?.ACCOUNTING_INTEGRATIONS || '/merchants/accounting-integrations/'}${integrationId}/sync/`);
  }
}

// Create singleton instance
export const b2bService = new B2BServiceImpl();

// Export types
export type { B2BService };
