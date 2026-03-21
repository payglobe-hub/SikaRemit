import api from '@/lib/api/axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Store {
  id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface CreateStoreData {
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
}

export async function getStores() {
  const response = await api.get('/api/v1/merchants/stores/')
  return response.data
}

export async function getStore(id: string) {
  const response = await api.get(`/api/v1/merchants/stores/${id}/`)
  return response.data
}

export async function createStore(data: CreateStoreData) {
  const response = await api.post('/api/v1/merchants/stores/', data)
  return response.data
}

export async function updateStore(id: string, data: Partial<CreateStoreData>) {
  const response = await api.patch(`/api/v1/merchants/stores/${id}/`, data)
  return response.data
}

export async function deleteStore(id: string) {
  const response = await api.delete(`/api/v1/merchants/stores/${id}/`)
  return response.data
}
