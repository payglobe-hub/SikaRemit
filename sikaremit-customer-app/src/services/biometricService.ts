/**
 * Biometric Authentication Service
 * 
 * Handles secure storage and retrieval of credentials for biometric login.
 * Uses expo-secure-store for encrypted storage.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants/api';

// Secure storage keys for biometric credentials
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';

export interface BiometricCredentials {
  email: string;
  password: string;
}

export interface BiometricAuthResult {
  success: boolean;
  credentials?: BiometricCredentials;
  error?: string;
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  biometricTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

// Biometric Service
const biometricService = {
  /**
   * Check if biometric authentication is available on the device
   */
  checkAvailability: async (): Promise<BiometricCapabilities> => {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      return {
        isAvailable,
        biometricTypes,
        isEnrolled,
        securityLevel,
      };
    } catch (error) {
      return {
        isAvailable: false,
        biometricTypes: [],
        isEnrolled: false,
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  },

  /**
   * Get a human-readable name for the biometric type
   */
  getBiometricTypeName: async (): Promise<string> => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris';
    }
    return 'Biometric';
  },

  /**
   * Store credentials securely for biometric login
   */
  storeCredentials: async (email: string, password: string): Promise<boolean> => {
    try {
      const credentials: BiometricCredentials = { email, password };
      const encryptedCredentials = JSON.stringify(credentials);
      
      await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, encryptedCredentials, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      
      // Store email separately for display purposes
      await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
      
      return true;
    } catch (error) {
      console.error('Failed to store biometric credentials:', error);
      return false;
    }
  },

  /**
   * Check if credentials are stored for biometric login
   */
  hasStoredCredentials: async (): Promise<boolean> => {
    try {
      const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return credentials !== null;
    } catch (error) {
      return false;
    }
  },

  /**
   * Get the stored email (for display purposes)
   */
  getStoredEmail: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    } catch (error) {
      return null;
    }
  },

  /**
   * Authenticate with biometrics and retrieve stored credentials
   */
  authenticateAndGetCredentials: async (
    promptMessage?: string
  ): Promise<BiometricAuthResult> => {
    try {
      // Check if biometrics are available
      const capabilities = await biometricService.checkAvailability();
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      // Check if credentials are stored
      const hasCredentials = await biometricService.hasStoredCredentials();
      if (!hasCredentials) {
        return {
          success: false,
          error: 'No credentials stored for biometric login. Please log in with your password first.',
        };
      }

      // Perform biometric authentication
      const biometricType = await biometricService.getBiometricTypeName();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Log in with ${biometricType}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Password',
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error === 'user_cancel' 
            ? 'Authentication cancelled' 
            : result.error === 'user_fallback'
              ? 'User chose to use password'
              : 'Biometric authentication failed',
        };
      }

      // Retrieve stored credentials
      const credentialsJson = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsJson) {
        return {
          success: false,
          error: 'Failed to retrieve stored credentials',
        };
      }

      const credentials: BiometricCredentials = JSON.parse(credentialsJson);
      return {
        success: true,
        credentials,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  },

  /**
   * Simple biometric authentication (without retrieving credentials)
   */
  authenticate: async (promptMessage?: string): Promise<boolean> => {
    try {
      const biometricType = await biometricService.getBiometricTypeName();
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || `Authenticate with ${biometricType}`,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch (error) {
      return false;
    }
  },

  /**
   * Clear stored biometric credentials
   */
  clearCredentials: async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear biometric credentials:', error);
      return false;
    }
  },

  /**
   * Update stored password (e.g., after password change)
   */
  updatePassword: async (newPassword: string): Promise<boolean> => {
    try {
      const email = await biometricService.getStoredEmail();
      if (!email) {
        return false;
      }
      return await biometricService.storeCredentials(email, newPassword);
    } catch (error) {
      return false;
    }
  },

  /**
   * Check if biometric login is enabled for this device
   */
  isBiometricLoginEnabled: async (): Promise<boolean> => {
    try {
      const enabled = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  },

  /**
   * Enable or disable biometric login
   */
  setBiometricLoginEnabled: async (enabled: boolean): Promise<void> => {
    await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
    
    // If disabling, also clear stored credentials
    if (!enabled) {
      await biometricService.clearCredentials();
    }
  },
};

export default biometricService;
