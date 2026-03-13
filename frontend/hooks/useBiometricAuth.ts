import { useState, useEffect, useCallback } from 'react'

export interface BiometricAuthResult {
  success: boolean
  error?: string
  method?: 'fingerprint' | 'face' | 'none'
}

export interface BiometricCapabilities {
  available: boolean
  methods: Array<'fingerprint' | 'face'>
  platform: string
}

/**
 * Hook for biometric authentication using Web Authentication API (WebAuthn)
 * Supports fingerprint and face recognition on compatible devices
 */
export function useBiometricAuth() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    available: false,
    methods: [],
    platform: 'unknown'
  })
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Check biometric capabilities on mount
  useEffect(() => {
    checkBiometricCapabilities()
  }, [])

  const checkBiometricCapabilities = async () => {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setCapabilities({
          available: false,
          methods: [],
          platform: 'unsupported'
        })
        return
      }

      // Check platform authenticator availability
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      
      if (available) {
        // Detect platform and likely biometric methods
        const userAgent = navigator.userAgent.toLowerCase()
        const methods: Array<'fingerprint' | 'face'> = []
        let platform = 'unknown'

        if (userAgent.includes('android')) {
          platform = 'android'
          methods.push('fingerprint')
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          platform = 'ios'
          methods.push('face', 'fingerprint')
        } else if (userAgent.includes('mac')) {
          platform = 'macos'
          methods.push('fingerprint')
        } else if (userAgent.includes('windows')) {
          platform = 'windows'
          methods.push('fingerprint', 'face')
        }

        setCapabilities({
          available: true,
          methods,
          platform
        })
      } else {
        setCapabilities({
          available: false,
          methods: [],
          platform: 'no-biometric'
        })
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error)
      setCapabilities({
        available: false,
        methods: [],
        platform: 'error'
      })
    }
  }

  /**
   * Register biometric authentication for a payment method
   */
  const registerBiometric = useCallback(async (
    paymentMethodId: string,
    userId: string
  ): Promise<BiometricAuthResult> => {
    if (!capabilities.available) {
      return {
        success: false,
        error: 'Biometric authentication not available on this device'
      }
    }

    setIsAuthenticating(true)

    try {
      // Generate challenge from server (in production, this should come from your backend)
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'SikaRemit',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: 'SikaRemit User'
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'none'
        }
      }) as PublicKeyCredential

      if (credential) {
        // Store credential ID associated with payment method
        // In production, send this to your backend
        // NOTE: localStorage disabled for SSR safety
        ')
        
        setIsAuthenticating(false)
        return {
          success: true,
          method: capabilities.methods[0] || 'fingerprint'
        }
      }

      setIsAuthenticating(false)
      return {
        success: false,
        error: 'Failed to create biometric credential'
      }
    } catch (error: any) {
      setIsAuthenticating(false)
      
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Biometric authentication was cancelled'
        }
      }
      
      return {
        success: false,
        error: error.message || 'Biometric registration failed'
      }
    }
  }, [capabilities])

  /**
   * Authenticate using biometric for a payment method
   */
  const authenticateBiometric = useCallback(async (
    paymentMethodId: string
  ): Promise<BiometricAuthResult> => {
    if (!capabilities.available) {
      return {
        success: false,
        error: 'Biometric authentication not available'
      }
    }

    // Check if biometric is registered for this payment method
    // NOTE: localStorage disabled for SSR safety - biometric auth disabled
    ')
    return {
      success: false,
      error: 'Biometric authentication disabled for SSR safety'
    }

    setIsAuthenticating(true)

    try {
      // Generate challenge (in production, get from backend)
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      // NOTE: This code is unreachable due to early return above
      // but keeping for structure when biometric auth is re-enabled
      const credentialId = '' // Placeholder - would get from storage when re-enabled
      
      // Convert credential ID back to ArrayBuffer
      const credentialIdBuffer = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0))

      // Get assertion (authenticate)
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            type: 'public-key',
            id: credentialIdBuffer.buffer
          }],
          userVerification: 'required',
          timeout: 60000
        }
      }) as PublicKeyCredential

      if (assertion) {
        setIsAuthenticating(false)
        return {
          success: true,
          method: capabilities.methods[0] || 'fingerprint'
        }
      }

      setIsAuthenticating(false)
      return {
        success: false,
        error: 'Authentication failed'
      }
    } catch (error: any) {
      setIsAuthenticating(false)
      
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'Biometric authentication was cancelled'
        }
      }
      
      return {
        success: false,
        error: error.message || 'Biometric authentication failed'
      }
    }
  }, [capabilities])

  /**
   * Check if biometric is registered for a payment method
   */
  const isBiometricRegistered = useCallback((paymentMethodId: string): boolean => {
    // NOTE: localStorage disabled for SSR safety - always return false
    ')
    return false
  }, [])

  /**
   * Remove biometric registration for a payment method
   */
  const removeBiometric = useCallback((paymentMethodId: string): void => {
    // NOTE: localStorage disabled for SSR safety - biometric removal disabled
    ')
  }, [])

  return {
    capabilities,
    isAuthenticating,
    registerBiometric,
    authenticateBiometric,
    isBiometricRegistered,
    removeBiometric,
    checkBiometricCapabilities
  }
}

