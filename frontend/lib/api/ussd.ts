import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Track if we've already warned about missing USSD endpoints
const warnedEndpoints = new Set<string>()

function warnOnce(endpoint: string, message: string) {
  if (!warnedEndpoints.has(endpoint)) {
    warnedEndpoints.add(endpoint)
    console.warn(message)
  }
}

function getAuthHeaders() {
  // Auth headers will be added by axios interceptor
  return {}
}

export interface USSDTransaction {
  id: string
  session_id: string
  phone_number: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  service_code: string
  current_menu?: string
  text?: string
  menu_data?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface USSDSession {
  id: string
  phone_number: string
  session_id: string
  service_code: string
  status: 'active' | 'completed' | 'timeout'
  current_menu?: string
  started_at: string
  ended_at?: string
  created_at: string
  last_activity: string
  menu_history?: string[]
  data?: Record<string, any>
  steps: Array<{
    step: number
    input: string
    response: string
    timestamp: string
  }>
}

export interface USSDStats {
  total_sessions: number
  active_sessions: number
  completed_sessions: number
  timeout_sessions: number
  completed_transactions: number
  total_amount: number
  success_rate: number
  average_duration: number
  by_service: Array<{
    service_code: string
    count: number
  }>
  popular_menus?: Array<{
    menu: string
    count: number
  }>
}

export async function getUSSDTransactions(params?: any): Promise<USSDTransaction[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/admin/ussd/transactions/`, {
      headers: getAuthHeaders(),
      params
    })
    return response.data.results || response.data || []
  } catch (error: any) {
    if (error?.response?.status === 404) {
      warnOnce('transactions', 'USSD transactions endpoint not available')
      return []
    }
    throw error
  }
}

export async function getUSSDSessions(params?: any): Promise<USSDSession[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/admin/ussd/sessions/`, {
      headers: getAuthHeaders(),
      params
    })
    return response.data.results || response.data || []
  } catch (error: any) {
    if (error?.response?.status === 404) {
      warnOnce('sessions', 'USSD sessions endpoint not available')
      return []
    }
    throw error
  }
}

export async function getUSSDStats(): Promise<USSDStats> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/v1/admin/ussd/stats/`, {
      headers: getAuthHeaders()
    })
    return response.data
  } catch (error: any) {
    if (error?.response?.status === 404) {
      warnOnce('stats', 'USSD stats endpoint not available')
      return {
        total_sessions: 0,
        active_sessions: 0,
        completed_sessions: 0,
        timeout_sessions: 0,
        completed_transactions: 0,
        total_amount: 0,
        success_rate: 0,
        average_duration: 0,
        by_service: []
      }
    }
    throw error
  }
}

export async function simulateUSSD(data: { phone_number: string; service_code: string; input?: string }) {
  const response = await axios.post(
    `${API_BASE_URL}/api/v1/admin/ussd/simulate/`,
    {
      phone_number: data.phone_number,
      service_code: data.service_code,
      input: data.input || ''
    },
    {
      headers: getAuthHeaders()
    }
  )
  return response.data
}

// USSD Menu Types
export interface USSDMenuOption {
  input: string
  text: string
  action?: string
}

export interface USSDMenu {
  id: number
  menu_id: string
  menu_type: string
  title: string
  content: string
  options: USSDMenuOption[]
  language: string
  is_default: boolean
  parent_menu_id: number | null
  parent_menu_title: string | null
  timeout_seconds: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface USSDMenuType {
  value: string
  label: string
}

export interface USSDMenuCreateData {
  menu_id: string
  menu_type: string
  title: string
  content: string
  options: USSDMenuOption[]
  language?: string
  is_default?: boolean
  parent_menu?: number | null
  timeout_seconds?: number
  is_active?: boolean
}

// USSD Menu API Functions
export async function getUSSDMenus(params?: {
  menu_type?: string
  language?: string
  is_active?: boolean
  page?: number
  limit?: number
}): Promise<{ results: USSDMenu[]; total: number; page: number; pages: number }> {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/ussd/menus/`, {
    headers: getAuthHeaders(),
    params
  })
  return response.data
}

export async function getUSSDMenuTypes(): Promise<USSDMenuType[]> {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/ussd/menus/types/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function getUSSDMenu(id: number): Promise<USSDMenu> {
  const response = await axios.get(`${API_BASE_URL}/api/v1/admin/ussd/menus/${id}/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function createUSSDMenu(data: USSDMenuCreateData): Promise<USSDMenu> {
  const response = await axios.post(`${API_BASE_URL}/api/v1/admin/ussd/menus/`, data, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function updateUSSDMenu(id: number, data: Partial<USSDMenuCreateData>): Promise<USSDMenu> {
  const response = await axios.patch(`${API_BASE_URL}/api/v1/admin/ussd/menus/${id}/`, data, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function deleteUSSDMenu(id: number): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/v1/admin/ussd/menus/${id}/`, {
    headers: getAuthHeaders()
  })
}

export async function resetUSSDSimulation(data: { phone_number: string; service_code: string }): Promise<{ success: boolean; message: string }> {
  const response = await axios.post(`${API_BASE_URL}/api/v1/admin/ussd/simulate/reset/`, data, {
    headers: getAuthHeaders()
  })
  return response.data
}
