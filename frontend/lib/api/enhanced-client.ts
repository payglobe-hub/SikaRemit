import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { authTokens } from '@/lib/utils/cookie-auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableMethods: ['GET', 'PUT', 'PATCH', 'DELETE']
}

// Offline detection
const isOnline = () => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine
  }
  return true
}

// Calculate delay with exponential backoff
const calculateDelay = (attemptNumber: number) => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attemptNumber - 1)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

// Check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  if (!error.response) {
    // Network errors are retryable
    return true
  }
  
  const { status, config } = error.response
  const method = config?.method?.toUpperCase()
  
  return (
    RETRY_CONFIG.retryableStatusCodes.includes(status!) &&
    RETRY_CONFIG.retryableMethods.includes(method as any)
  )
}

// Enhanced error types
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public retryable: boolean = false,
    public originalError?: AxiosError
  ) {
    super(message)
    this.name = 'APIError'
  }
}

// User-friendly error messages
const getErrorMessage = (error: AxiosError): string => {
  const status = error.response?.status
  const code = error.code
  
  // Network errors
  if (code === 'NETWORK_ERROR' || !navigator.onLine) {
    return 'You appear to be offline. Please check your internet connection and try again.'
  }
  
  // HTTP status codes
  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input and try again.'
    case 401:
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You don\'t have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 408:
      return 'The request timed out. Please try again.'
    case 409:
      return 'There was a conflict with your request. Please refresh and try again.'
    case 422:
      return 'The provided data is invalid. Please check your input and try again.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'Server error occurred. Please try again later.'
    case 502:
      return 'Service temporarily unavailable. Please try again later.'
    case 503:
      return 'Service maintenance in progress. Please try again later.'
    case 504:
      return 'Gateway timeout. Please try again later.'
    default:
      if (code === 'ECONNABORTED') {
        return 'Request timed out. Please check your connection and try again.'
      }
      return 'An unexpected error occurred. Please try again.'
  }
}

// Create enhanced axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor with offline detection
api.interceptors.request.use(
  (config) => {
    // Check if online
    if (!isOnline()) {
      throw new APIError(
        'You appear to be offline. Please check your internet connection.',
        undefined,
        'OFFLINE',
        false
      )
    }
    
    // Add auth token for non-public requests
    if (!isPublicAuthRequest(config.url)) {
      const token = authTokens.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    
    return config
  },
  (error) => Promise.reject(error)
)

// Enhanced response interceptor with retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { 
      _retryCount?: number
      _retry?: boolean
    }
    
    // Initialize retry count
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0
    }
    
    // Check if we should retry
    if (
      originalRequest._retryCount < RETRY_CONFIG.maxRetries &&
      isRetryableError(error) &&
      isOnline()
    ) {
      originalRequest._retryCount++
      
      // Calculate delay
      const delay = calculateDelay(originalRequest._retryCount)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
      
      try {
        return await api(originalRequest)
      } catch (retryError) {
        // If retry fails, continue with error handling
        return Promise.reject(retryError)
      }
    }
    
    // Handle 401 errors with token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest.url)
    ) {
      // Token refresh logic (existing implementation)
      try {
        if (typeof window !== 'undefined') {
          const refreshToken = authTokens.getRefreshToken()
          if (!refreshToken) {
            authTokens.clearTokens()
            window.location.href = '/auth'
            return Promise.reject(error)
          }

          const response = await axios.post(
            `${API_BASE_URL}/api/v1/accounts/refresh/`,
            { refresh: refreshToken }
          )

          const { access } = response.data
          authTokens.setAccessToken(access)

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`
          }
          originalRequest._retry = true

          return api(originalRequest)
        }
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          authTokens.clearTokens()
          window.location.href = '/auth'
        }
        return Promise.reject(refreshError)
      }
    }
    
    // Convert to user-friendly error
    const userMessage = getErrorMessage(error)
    const apiError = new APIError(
      userMessage,
      error.response?.status,
      error.code,
      isRetryableError(error),
      error
    )
    
    return Promise.reject(apiError)
  }
)

// Helper function to check if request is public
function isPublicAuthRequest(url?: string): boolean {
  if (!url) return false
  
  const PUBLIC_AUTH_PATHS = [
    '/api/v1/accounts/login/',
    '/api/v1/accounts/register/',
    '/api/v1/accounts/refresh/',
    '/api/v1/accounts/password/reset/',
    '/api/v1/accounts/password/reset/confirm/',
    '/api/v1/accounts/verify-email/',
    '/api/v1/accounts/resend-verification/',
    '/api/v1/payments/currencies/',
    '/api/v1/payments/exchange-rates/',
    '/api/v1/users/admin/permissions-overview/',
    '/api/v1/users/admin/accessible-admins/',
  ]
  
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path))
}

// Enhanced API functions with error handling
export const enhancedApi = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await api.get(url, config)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await api.post(url, data, config)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await api.put(url, data, config)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await api.patch(url, data, config)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    try {
      const response = await api.delete(url, config)
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export default api
