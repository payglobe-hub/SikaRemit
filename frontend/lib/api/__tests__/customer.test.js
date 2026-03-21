/**
 * @jest-environment jsdom
 */

import { getCustomerPayments, getAccountBalance, getCustomerStats } from '../customer'

// Mock the enhanced API
const mockEnhancedApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
}

jest.mock('../enhanced-client', () => ({
  enhancedApi: mockEnhancedApi
}))

describe('Customer API Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getCustomerPayments', () => {
    it('should fetch customer payments successfully', async () => {
      const mockPayments = [
        {
          id: '1',
          amount: 100,
          currency: 'GHS',
          status: 'completed',
          merchant: 'Test Merchant',
          description: 'Test payment',
          created_at: '2024-01-01T00:00:00Z',
          payment_method: 'mobile_money'
        }
      ]

      mockEnhancedApi.get.mockResolvedValue(mockPayments)

      const result = await getCustomerPayments()

      expect(mockEnhancedApi.get).toHaveBeenCalledWith('/api/v1/accounts/customers/payments/', undefined)
      expect(result).toEqual(mockPayments)
    })

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error')
      mockEnhancedApi.get.mockRejectedValue(mockError)

      await expect(getCustomerPayments()).rejects.toThrow('Network error')
    })

    it('should pass query parameters correctly', async () => {
      const params = { page: 1, limit: 10 }
      mockEnhancedApi.get.mockResolvedValue([])

      await getCustomerPayments(params)

      expect(mockEnhancedApi.get).toHaveBeenCalledWith('/api/v1/accounts/customers/payments/', params)
    })

    it('should handle different response formats', async () => {
      const mockResponse = { data: [{ id: '1', amount: 100 }] }
      mockEnhancedApi.get.mockResolvedValue(mockResponse)

      const result = await getCustomerPayments()

      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getAccountBalance', () => {
    it('should fetch account balance successfully', async () => {
      const mockBalance = {
        available: 1000,
        pending: 100,
        currency: 'GHS',
        last_updated: '2024-01-01T00:00:00Z'
      }

      mockEnhancedApi.get.mockResolvedValue(mockBalance)

      const result = await getAccountBalance()

      expect(mockEnhancedApi.get).toHaveBeenCalledWith('/api/v1/accounts/customers/balance/')
      expect(result).toEqual(mockBalance)
    })

    it('should handle balance API errors', async () => {
      const mockError = new Error('Failed to fetch balance')
      mockEnhancedApi.get.mockRejectedValue(mockError)

      await expect(getAccountBalance()).rejects.toThrow('Failed to fetch balance')
    })
  })

  describe('getCustomerStats', () => {
    it('should fetch customer statistics successfully', async () => {
      const mockStats = {
        transactions_this_month: 10,
        success_rate: 95.5,
        total_transactions: 100,
        completed_transactions: 95,
        failed_transactions: 5
      }

      mockEnhancedApi.get.mockResolvedValue(mockStats)

      const result = await getCustomerStats()

      expect(mockEnhancedApi.get).toHaveBeenCalledWith('/api/v1/accounts/customers/stats/')
      expect(result).toEqual(mockStats)
    })

    it('should handle stats API errors', async () => {
      const mockError = new Error('Failed to fetch stats')
      mockEnhancedApi.get.mockRejectedValue(mockError)

      await expect(getCustomerStats()).rejects.toThrow('Failed to fetch stats')
    })
  })

  describe('API Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error')
      networkError.name = 'NetworkError'
      
      mockEnhancedApi.get.mockRejectedValue(networkError)

      await expect(getCustomerPayments()).rejects.toThrow('Network Error')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout')
      Object.defineProperty(timeoutError, 'code', {
        value: 'ECONNABORTED',
        writable: true
      })
      
      mockEnhancedApi.get.mockRejectedValue(timeoutError)

      await expect(getCustomerPayments()).rejects.toThrow('Request timeout')
    })

    it('should handle server errors', async () => {
      const serverError = new Error('Server error')
      serverError.name = 'APIError'
      serverError.status = 500
      
      mockEnhancedApi.get.mockRejectedValue(serverError)

      await expect(getCustomerPayments()).rejects.toThrow('Server error')
    })
  })
})
