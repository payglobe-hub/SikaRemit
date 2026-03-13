/**
 * Merchant App Type Definitions
 */

// Import all common types from shared library
export * from '@sikaremit/mobile-shared';

// Merchant-specific types that extend or differ from shared types
export interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_registration_number?: string;
  business_address?: string;
  business_phone?: string;
  business_email?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MerchantStats {
  total_transactions: number;
  total_revenue: number;
  average_transaction_value: number;
  active_customers: number;
  pending_transactions: number;
  revenue_this_month: number;
  revenue_last_month: number;
  growth_percentage: number;
}

// Device types specific to merchant app
export interface Device {
  id: string;
  name: string;
  type: 'pos' | 'mobile' | 'web';
  status: 'active' | 'inactive' | 'suspended';
  last_active: string;
  created_at: string;
}
