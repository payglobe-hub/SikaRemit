// Utility function to get provider image based on name
export const getProviderImage = (providerName: string): string | null => {
  const normalizedName = providerName.toLowerCase().trim()
  const mappings: Array<{ keys: string[], image: string }> = [
    { keys: ['mtn'], image: '/logos/mtn-momo.png' },
    { keys: ['airteltigo', 'airtel_tigo'], image: '/logos/airteltigo-money.jpg' },
    { keys: ['telecel'], image: '/logos/telecel-cash.jpg' },
    { keys: ['g_money', 'gmoney', 'g-money'], image: '/logos/g-money.svg' },
  ]

  for (const mapping of mappings) {
    if (mapping.keys.some(key => normalizedName.includes(key))) {
      return mapping.image
    }
  }
  return null
}
