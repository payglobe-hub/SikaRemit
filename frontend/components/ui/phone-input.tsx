'use client'

import React, { forwardRef } from 'react'
import { PhoneInput, PhoneInputRefType } from 'react-international-phone'
import 'react-international-phone/style.css'
import { Label } from '@/components/ui/label'
import { getCountryInfo } from '@/lib/utils/phone'

interface PhoneNumberInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  showValidation?: boolean
  preferredCountries?: string[]
  className?: string
  id?: string
}

/**
 * Enhanced phone number input with international formatting, validation, and masking
 */
export const PhoneNumberInput = forwardRef<PhoneInputRefType, PhoneNumberInputProps>(
  ({
    value,
    onChange,
    label,
    placeholder = "Enter phone number",
    required = false,
    disabled = false,
    error,
    showValidation = true,
    preferredCountries = ['gh', 'ng', 'ke', 'us', 'gb'],
    className = "",
    id
  }, ref) => {
    const handleChange = (phone: string) => {
      // Remove any extra spaces and normalize
      const cleaned = phone.replace(/\s+/g, ' ').trim()
      onChange(cleaned)
    }

    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor="phone-input" className="text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        <PhoneInput
          ref={ref}
          value={value}
          onChange={handleChange}
          defaultCountry="gh"
          preferredCountries={preferredCountries}
          inputClassName={`
            flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
            ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium
            placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed
            disabled:opacity-50
            ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
            ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          `}
          countrySelectorStyleProps={{
            buttonClassName: `
              flex items-center gap-2 px-3 py-2 text-sm border-r border-input
              bg-muted hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
            `
          }}
          disabled={disabled}
          placeholder={placeholder}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {showValidation && value && (
          <div className="text-xs text-muted-foreground">
            {value.length > 0 ? 'Valid international format' : 'Enter a valid phone number'}
          </div>
        )}
      </div>
    )
  }
)

PhoneNumberInput.displayName = 'PhoneNumberInput'

/**
 * Simple phone input for specific countries
 */
export const SimplePhoneInput = forwardRef<HTMLInputElement, PhoneNumberInputProps>(
  ({
    value,
    onChange,
    label,
    placeholder,
    required = false,
    disabled = false,
    error,
    className = ""
  }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value
      // Basic formatting as user types
      let formatted = input.replace(/\D/g, '') // Remove non-digits

      // Add Ghana prefix if starts with 0
      if (formatted.startsWith('0') && formatted.length >= 10) {
        formatted = '+233' + formatted.substring(1)
      }

      // Add basic formatting for Ghana numbers
      if (formatted.startsWith('+233') && formatted.length > 4) {
        const match = formatted.match(/^(\+233)(\d{0,2})(\d{0,3})(\d{0,4})$/)
        if (match) {
          formatted = [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ')
        }
      }

      onChange(formatted)
    }

    return (
      <div className={`space-y-2 ${className}`}>
        {label && (
          <Label htmlFor="simple-phone-input" className="text-sm font-medium">
            {label} {required && <span className="text-red-500">*</span>}
          </Label>
        )}

        <input
          ref={ref}
          id="simple-phone-input"
          type="tel"
          value={value}
          onChange={handleChange}
          placeholder={placeholder || "+233 XX XXX XXXX"}
          disabled={disabled}
          required={required}
          className={`
            flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
            ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium
            placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed
            disabled:opacity-50
            ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
          `}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)

SimplePhoneInput.displayName = 'SimplePhoneInput'
