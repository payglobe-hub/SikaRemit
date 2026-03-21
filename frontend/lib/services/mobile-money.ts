import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface MobileMoneyPaymentRequest {
  amount: number
  currency: string
  phoneNumber: string
  provider: 'mtn' | 'airtel' | 'telecel' | 'g_money'
  description?: string
}

export interface MobileMoneyPaymentResponse {
  reference: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
}

export interface MobileMoneyProvider {
  value: 'mtn' | 'airtel' | 'telecel' | 'g_money'
  label: string
  prefix: string[]
}

class MobileMoneyService {
  private providers: MobileMoneyProvider[] = [
    {
      value: 'mtn',
      label: 'MTN Mobile Money',
      prefix: ['024', '054', '055', '059']
    },
    {
      value: 'airtel',
      label: 'AirtelTigo Money',
      prefix: ['026', '056', '027', '057']
    },
    {
      value: 'telecel',
      label: 'Telecel Cash',
      prefix: ['020', '050']
    },
    {
      value: 'g_money',
      label: 'G-Money',
      prefix: ['023', '053']
    }
  ]

  getSupportedProviders(): MobileMoneyProvider[] {
    return this.providers
  }

  validatePhoneNumber(phoneNumber: string, provider: 'mtn' | 'airtel' | 'telecel' | 'g_money'): boolean {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')
    
    // Check if it's a valid length (10 digits for Ghana)
    if (cleaned.length !== 10 && cleaned.length !== 12) {
      return false
    }

    // Get the prefix (first 3 digits)
    const prefix = cleaned.slice(0, 3)
    
    // Find the provider
    const providerData = this.providers.find(p => p.value === provider)
    if (!providerData) return false

    // Check if prefix matches the provider
    return providerData.prefix.includes(prefix)
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '')
    
    // If it starts with country code (233), keep it
    // Otherwise, add it
    if (cleaned.length === 10) {
      cleaned = '233' + cleaned.slice(1) // Remove leading 0 and add country code
    }
    
    return cleaned
  }

  async initiatePayment(request: MobileMoneyPaymentRequest): Promise<MobileMoneyPaymentResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/payments/mobile-money/initiate`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        }
      )
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to initiate payment')
    }
  }

  async checkPaymentStatus(reference: string): Promise<MobileMoneyPaymentResponse> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/payments/mobile-money/status/${reference}`,
        {
          withCredentials: true
        }
      )
      return response.data
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to check payment status')
    }
  }
}

export const mobileMoneyService = new MobileMoneyService()
