// Shared type definitions for SikaRemit mobile applications

// Shared type definitions for SikaRemit mobile applications

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar?: string;
  is_verified: boolean;
  kyc_status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  mfa_enabled?: boolean;
  created_at: string;
  updated_at: string;
  // Merchant-specific fields
  is_merchant?: boolean;
  business_name?: string;
  business_type?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  business_name?: string;
  business_type?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  currency: string;
  is_default: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'bill_payment' | 'remittance' | 'topup' | 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  recipient?: {
    name: string;
    phone?: string;
    email?: string;
  };
  sender?: {
    name: string;
    phone?: string;
    email?: string;
  };
  description?: string;
  reference: string;
  fee: number;
  created_at: string;
  completed_at?: string;
  counterparty?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile_money' | 'bank_account' | 'sikaremit_wallet';
  name: string;
  last_four?: string;
  provider?: string;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag?: string;
  is_active?: boolean;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface Bill {
  id: string;
  type: 'electricity' | 'water' | 'internet' | 'tv' | 'tax' | 'other';
  provider: string;
  account_number: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'transaction' | 'security' | 'promotion' | 'system';
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface KYCDocument {
  id: string;
  type: 'passport' | 'national_id' | 'drivers_license' | 'utility_bill';
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface MobileMoneyProvider {
  id: string;
  name: string;
  code: string;
  country_code: string;
  currency: string;
  is_active: boolean;
  ussd_code?: string;
  logo?: string;
}

export interface QRCodeData {
  version: string;
  type: string;
  merchant_id: string;
  merchant_name: string;
  amount?: number;
  currency: string;
  reference: string;
  timestamp: string;
  expiry: string;
  description?: string;
  signature: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  message?: string;
}

export interface OfflineAction {
  id: string;
  type: string;
  data: Record<string, any>;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
  retry_count: number;
}

export interface Country {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
  currency: string;
}

export interface TelecomProvider {
  id: string;
  name: string;
  logo: string;
  country_code: string;
}

export interface DataPackage {
  id: string;
  name: string;
  data_amount: string;
  validity: string;
  price: number;
  currency: string;
}

// Merchant-specific types
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

// E-commerce Types
export * from './ecommerce';

// B2B Types
export * from './b2b';

// Referral Types
export interface ReferralCode {
  id: string;
  code: string;
  created_at: string;
  expires_at?: string;
  is_active: boolean;
  usage_count: number;
  max_uses?: number;
}

export interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_earnings: number;
  available_balance: number;
  referral_code?: string;
}

export interface ReferralReward {
  id: string;
  type: 'cash' | 'points' | 'discount';
  amount: number;
  currency?: string;
  description: string;
  claimed_at?: string;
  expires_at?: string;
}

export interface ReferralHistory {
  id: string;
  referred_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: 'pending' | 'completed' | 'expired';
  reward_earned: number;
  reward_type: string;
  created_at: string;
  completed_at?: string;
}
