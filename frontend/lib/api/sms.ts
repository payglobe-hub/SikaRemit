import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  // Auth headers will be added by axios interceptor
  return {}
}

export async function sendSMSVerification(phoneNumber: string) {
  const response = await axios.post(
    `${API_BASE_URL}/api/verification/sms/send/`,
    { phone_number: phoneNumber },
    {
      headers: getAuthHeaders()
    }
  )
  return response.data
}

export async function verifySMSCode(phoneNumber: string, code: string) {
  const response = await axios.post(
    `${API_BASE_URL}/api/verification/sms/verify/`,
    {
      phone_number: phoneNumber,
      code
    },
    {
      headers: getAuthHeaders()
    }
  )
  return response.data
}
