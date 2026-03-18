import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Create a simple axios instance without authentication for public endpoints
const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

export interface Country {
  id: number
  code: string
  name: string
  flag_emoji: string
  phone_code?: string
  phone_code_formatted?: string
  currency?: string
  currency_code?: string
  currency_symbol?: string
  is_active: boolean
}

// No fallback countries - API is the single source of truth

// Dynamic countries array - loaded from API
export let countries: Country[] = []

// Load countries from API
let countriesLoaded = false

async function loadCountries() {
  if (countriesLoaded) return

  try {
    
    const response = await publicApiClient.get('/api/countries/')

    const data = response.data?.results || response.data
    if (Array.isArray(data)) {
      countries.length = 0 // Clear array
      countries.push(...data)
      countriesLoaded = true
      
    } else {
      
    }
  } catch (error: any) {
    
    // No fallback - countries array will remain empty
    // Components should handle empty state gracefully
    countriesLoaded = true
  }
}

// Initialize on module load
loadCountries()

// Export function to refresh countries
export async function refreshCountries(): Promise<Country[]> {
  countriesLoaded = false
  await loadCountries()
  return countries
}

