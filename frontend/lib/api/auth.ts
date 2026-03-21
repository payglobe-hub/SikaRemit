import axios from 'axios'
import { authTokens } from '@/lib/utils/cookie-auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper function to get auth headers
export function getAuthHeaders() {
  const token = authTokens.getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface RegisterData {
  email: string
  password: string
  password2: string
  firstName: string
  lastName: string
  phone?: string
  userType?: number
}

export interface LoginResponse {
  access: string
  refresh: string
  user: {
    id: string
    email: string
    first_name: string
    last_name: string
    role: string
    is_verified: boolean
  }
  user_type_info?: {
    label: string
    color: string
    bgColor: string
    icon: string
    description: string
  }
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export async function register(data: RegisterData) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/register/`, {
    email: data.email,
    password: data.password,
    password2: data.password2,
    first_name: data.firstName,
    last_name: data.lastName,
    phone: data.phone,
    user_type: data.userType || 6
  })
  return response.data
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/login/`, {
    email,
    password
  })
  return response.data
}

export async function logout() {
  const token = authTokens.getAccessToken()
  if (!token) return

  try {
    await axios.post(
      `${API_BASE_URL}/api/v1/accounts/logout/`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )
  } finally {
    authTokens.clearTokens()
  }
}

export async function forgotPassword(email: string) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/password/reset/`, {
    email
  })
  return response.data
}

export async function resetPassword(token: string, password: string) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/password/reset/confirm/`, {
    token,
    password
  })
  return response.data
}

export async function changePassword(data: ChangePasswordData) {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.post(
    `${API_BASE_URL}/api/v1/accounts/password/change/`,
    {
      current_password: data.currentPassword,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  return response.data
}

export async function verifyEmail(token: string) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/verify-email/`, {
    token
  })
  return response.data
}

export async function resendVerificationEmail(email: string) {
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/resend-verification/`, {
    email
  })
  return response.data
}

export async function getProfile() {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.get(`${API_BASE_URL}/api/v1/accounts/profile/`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

export async function updateProfile(data: any) {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.patch(`${API_BASE_URL}/api/v1/accounts/profile/`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  return response.data
}

// Two-factor authentication functions
export async function requestTwoFactor() {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.post(
    `${API_BASE_URL}/api/v1/accounts/2fa/setup/`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  return response.data
}

export async function verifyTwoFactor(code: string) {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.post(
    `${API_BASE_URL}/api/v1/accounts/mfa/verify/`,
    { code },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  return response.data
}

export async function googleOAuthCallback(code: string) {
  // Must send the same redirect_uri that was used in the OAuth initiation
  const redirectUri = `${window.location.origin}/auth/callback/google`
  
  const response = await axios.post(`${API_BASE_URL}/api/v1/accounts/google/callback/`, {
    code,
    redirect_uri: redirectUri
  })

  if (response.status === 503) {
    throw new Error('Google OAuth is not configured. Please use email and password to sign in.')
  }

  return response.data
}

export async function getBackupCodes() {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.get(
    `${API_BASE_URL}/api/v1/accounts/mfa/backup-codes/`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  return response.data
}

export async function generateBackupCodes() {
  const token = authTokens.getAccessToken()
  if (!token) throw new Error('Not authenticated')

  const response = await axios.post(
    `${API_BASE_URL}/api/v1/accounts/mfa/backup-codes/`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  )
  return response.data
}
