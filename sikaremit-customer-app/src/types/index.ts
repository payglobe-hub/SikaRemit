// Import only the most common types from shared library
export type {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  Wallet,
  PaymentMethod,
  Currency,
  ExchangeRate,
  Notification,
  Country,
  TelecomProvider,
  DataPackage,
  KYCDocument,
  ApiResponse,
  PaginatedResponse,
  ApiError,
  MobileMoneyProvider,
  QRCodeData,
  OfflineAction,
} from '@sikaremit/mobile-shared';

// Temporarily define types locally until shared library compilation is fixed
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

// Define SupportTicket locally for navigation (temporary fix)
export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

// Customer app specific navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
  BiometricSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Payments: undefined;
  Shopping: undefined;
  History: undefined;
  Profile: undefined;
  Wishlist: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
  Notifications: undefined;
  QRScanner: undefined;
};

export type PaymentsStackParamList = {
  PaymentsHome: undefined;
  Deposit: undefined;
  SendMoney: undefined;
  RequestMoney: undefined;
  BillPayment: undefined;
  BillPaymentDetails: { bill: Bill };
  Airtime: undefined;
  DataBundle: undefined;
  Remittance: undefined;
  PaymentConfirmation: { transaction: Transaction };
  PaymentSuccess: { transaction: Transaction };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  KYCVerification: undefined;
  PaymentMethods: undefined;
  AddPaymentMethod: undefined;
  Security: undefined;
  Settings: undefined;
  Support: undefined;
  CreateTicket: undefined;
  TicketDetails: { ticket: SupportTicket };
  Referral: undefined;
};
