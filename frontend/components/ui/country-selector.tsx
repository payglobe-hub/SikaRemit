'use client'

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { COUNTRIES, getCountryInfo } from '@/lib/utils/phone'

interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  showFlags?: boolean
  className?: string
}

/**
 * Enhanced country selector with flags and better UI
 */
function CountrySelector({
  value,
  onChange,
  label = "Country",
  placeholder = "Select country",
  required = false,
  disabled = false,
  error,
  showFlags = true,
  className = ""
}: CountrySelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={`!text-gray-900 font-semibold ${error ? 'border-red-500' : ''}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-[300px]">
          {COUNTRIES
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((country) => (
              <SelectItem
                key={country.code}
                value={country.code}
                className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {showFlags && <span className="text-lg">{country.flag}</span>}
                  <div className="flex flex-col">
                    <span className="font-medium">{country.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {country.dialCode} • {country.currency}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

/**
 * Compact country selector for forms
 */
export function CompactCountrySelector({
  value,
  onChange,
  placeholder = "Select country",
  required = false,
  disabled = false,
  error,
  className = ""
}: Omit<CountrySelectorProps, 'label' | 'showFlags'>) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`!text-gray-900 font-semibold ${error ? 'border-red-500' : ''} ${className}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-[200px] min-w-[200px]">
        {COUNTRIES
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((country) => (
            <SelectItem
              key={country.code}
              value={country.code}
              className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{country.flag}</span>
                <span className="font-medium">{country.name}</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Country display component
 */
export function CountryDisplay({ countryCode, showDetails = false }: { countryCode: string, showDetails?: boolean }) {
  const country = getCountryInfo(countryCode)

  if (!country) {
    return <span className="text-muted-foreground">{countryCode}</span>
  }

  if (showDetails) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-lg">{country.flag}</span>
        <div className="flex flex-col">
          <span className="font-medium">{country.name}</span>
          <span className="text-xs text-muted-foreground">
            {country.dialCode} • {country.currency}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{country.flag}</span>
      <span className="font-medium">{country.name}</span>
    </div>
  )
}

export { CountrySelector }
export default CountrySelector
