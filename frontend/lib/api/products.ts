import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  // Auth headers will be added by axios interceptor
  return {}
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  sku: string
  stock_quantity: number
  low_stock_threshold: number
  is_available: boolean
  store_id: string
  store_name?: string
  category?: string
  image?: string
  thumbnail?: string
  image_url?: string
  thumbnail_url?: string
  created_at: string
  updated_at?: string
}

export interface CreateProductData {
  name: string
  description: string
  price: number
  sku: string
  stock_quantity: number
  low_stock_threshold: number
  store_id: string
  category?: string
  image?: File
}

export async function getProducts(params?: { search?: string; store_id?: string; category?: string }) {
  const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/`, {
    headers: getAuthHeaders(),
    params
  })
  return response.data
}

export async function getProduct(id: string) {
  const response = await axios.get(`${API_BASE_URL}/api/v1/merchants/products/${id}/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function createProduct(data: CreateProductData) {
  const formData = new FormData()
  
  // Add all text fields
  Object.keys(data).forEach(key => {
    if (key !== 'image' && data[key as keyof CreateProductData] !== undefined) {
      formData.append(key, data[key as keyof CreateProductData] as string)
    }
  })
  
  // Add image file if provided
  if (data.image) {
    formData.append('image', data.image)
  }
  
  const response = await axios.post(`${API_BASE_URL}/api/v1/merchants/products/`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export async function updateProduct(id: string, data: Partial<CreateProductData>) {
  const response = await axios.patch(`${API_BASE_URL}/api/v1/merchants/products/${id}/`, data, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function deleteProduct(id: string) {
  const response = await axios.delete(`${API_BASE_URL}/api/v1/merchants/products/${id}/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function toggleProductAvailability(id: string, is_available: boolean) {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/merchants/products/${id}/`,
    { is_available },
    {
      headers: getAuthHeaders()
    }
  )
  return response.data
}

export async function updateProductStock(id: string, stock_quantity: number) {
  const response = await axios.patch(
    `${API_BASE_URL}/api/v1/merchants/products/${id}/`,
    { stock_quantity },
    {
      headers: getAuthHeaders()
    }
  )
  return response.data
}
