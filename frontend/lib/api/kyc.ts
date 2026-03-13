import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  // Auth headers will be added by axios interceptor
  return {}
}

export const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
]

export interface KYCUploadData {
  document_type: string
  document_number?: string
  expiry_date?: string
  file: File
}

export interface KYCDocument {
  id: string
  document_type: string
  document_number?: string
  status: 'pending' | 'approved' | 'rejected'
  uploaded_at: string
  verified_at?: string
  rejection_reason?: string
}

export interface BiometricFaceMatchData {
  selfie: File
  document_photo: File
}

export interface BiometricLivenessData {
  video: File
}

export interface BiometricResult {
  success: boolean
  confidence_score: number
  message: string
}

export async function uploadKYCDocument(data: KYCUploadData) {
  const formData = new FormData()
  formData.append('document_type', data.document_type)
  if (data.document_number) formData.append('document_number', data.document_number)
  if (data.expiry_date) formData.append('expiry_date', data.expiry_date)
  formData.append('file', data.file)

  const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/documents/`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export async function getKYCStatus() {
  const response = await axios.get(`${API_BASE_URL}/api/v1/kyc/status/`, {
    headers: getAuthHeaders()
  })
  return response.data
}

export async function getKYCDocuments(): Promise<KYCDocument[]> {
  const response = await axios.get(`${API_BASE_URL}/api/v1/kyc/documents/`, {
    headers: getAuthHeaders()
  })
  return response.data.results || response.data
}

export async function verifyBiometrics(data: BiometricFaceMatchData): Promise<BiometricResult> {
  const formData = new FormData()
  formData.append('selfie', data.selfie)
  formData.append('document_photo', data.document_photo)

  const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/biometrics/verify/`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export async function checkLiveness(data: BiometricLivenessData): Promise<BiometricResult> {
  const formData = new FormData()
  formData.append('video', data.video)

  const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/biometrics/liveness/`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}
