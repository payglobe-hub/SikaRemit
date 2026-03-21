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
