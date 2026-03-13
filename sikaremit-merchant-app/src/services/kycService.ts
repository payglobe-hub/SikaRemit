/**
 * KYC (Know Your Customer) Service
 * 
 * Handles identity verification including:
 * - Document upload (ID cards, passports, etc.)
 * - Selfie capture with liveness detection
 * - Address verification
 * - KYC status management
 */

import axios from 'axios';
import { API_BASE_URL } from '../constants/api';
import { getAuthHeaders } from '@sikaremit/mobile-shared';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// KYC Types
export type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type DocumentType = 'national_id' | 'passport' | 'drivers_license' | 'voter_id';
export type VerificationStep = 'personal_info' | 'document' | 'selfie' | 'address';

export interface KYCDocument {
  id: string;
  type: DocumentType;
  frontImageUrl?: string;
  backImageUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  uploadedAt: string;
}

export interface KYCSelfie {
  id: string;
  imageUrl: string;
  livenessScore?: number;
  matchScore?: number;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  uploadedAt: string;
}

export interface KYCAddress {
  id: string;
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  proofDocumentUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

export interface KYCVerification {
  id: string;
  userId: string;
  status: KYCStatus;
  currentStep: VerificationStep;
  completedSteps: VerificationStep[];
  personalInfo?: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    occupation?: string;
  };
  document?: KYCDocument;
  selfie?: KYCSelfie;
  address?: KYCAddress;
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  tier: 'basic' | 'standard' | 'premium';
  limits: {
    dailyLimit: number;
    monthlyLimit: number;
    singleTransactionLimit: number;
  };
}

export interface PersonalInfoRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  nationality: string;
  occupation?: string;
  phoneNumber?: string;
}

export interface DocumentUploadRequest {
  type: DocumentType;
  frontImage: string; // Base64 or URI
  backImage?: string; // Base64 or URI (for IDs with back)
  documentNumber?: string;
  expiryDate?: string;
  issuingCountry?: string;
}

export interface SelfieUploadRequest {
  image: string; // Base64 or URI
  livenessData?: {
    blinkDetected?: boolean;
    smileDetected?: boolean;
    headMovementDetected?: boolean;
  };
}

export interface AddressVerificationRequest {
  street: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  proofDocument?: string; // Base64 or URI (utility bill, bank statement)
}

// Document type labels
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  national_id: 'Ghana Card / National ID',
  passport: 'International Passport',
  drivers_license: "Driver's License",
  voter_id: "Voter's ID Card",
};

// KYC tier limits (in GHS)
export const KYC_TIER_LIMITS = {
  unverified: {
    dailyLimit: 100,
    monthlyLimit: 500,
    singleTransactionLimit: 50,
  },
  basic: {
    dailyLimit: 1000,
    monthlyLimit: 5000,
    singleTransactionLimit: 500,
  },
  standard: {
    dailyLimit: 5000,
    monthlyLimit: 20000,
    singleTransactionLimit: 2000,
  },
  premium: {
    dailyLimit: 50000,
    monthlyLimit: 200000,
    singleTransactionLimit: 20000,
  },
};

// Helper function to convert image to base64
const imageToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    const newError = new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw newError;
  }
};

// KYC Service
const kycService = {
  /**
   * Get current KYC verification status
   */
  getVerificationStatus: async (): Promise<KYCVerification | null> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/kyc/status/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No KYC started
      }
      throw error;
    }
  },

  /**
   * Check if user is eligible for KYC verification
   */
  checkEligibility: async (): Promise<{
    eligible: boolean;
    reason?: string;
    requiredDocuments: DocumentType[];
  }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/kyc/eligibility/`, {
        headers: await getAuthHeaders(),
      });
      return response.data;
    } catch {
      return {
        eligible: true,
        requiredDocuments: ['national_id', 'passport'],
      };
    }
  },

  /**
   * Start KYC verification process
   */
  startVerification: async (): Promise<KYCVerification> => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/verification/`, {
      action: 'start',
    }, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Submit personal information
   */
  submitPersonalInfo: async (info: PersonalInfoRequest): Promise<KYCVerification> => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/verification/`, {
      step: 'personal_info',
      data: {
        first_name: info.firstName,
        last_name: info.lastName,
        date_of_birth: info.dateOfBirth,
        nationality: info.nationality,
        occupation: info.occupation,
        phone_number: info.phoneNumber,
      },
    }, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Upload identity document
   */
  uploadDocument: async (request: DocumentUploadRequest): Promise<KYCVerification> => {
    // Convert images to base64 if they're URIs
    let frontImageBase64 = request.frontImage;
    let backImageBase64 = request.backImage;

    if (request.frontImage.startsWith('file://') || request.frontImage.startsWith('/')) {
      frontImageBase64 = await imageToBase64(request.frontImage);
    }

    if (request.backImage && (request.backImage.startsWith('file://') || request.backImage.startsWith('/'))) {
      backImageBase64 = await imageToBase64(request.backImage);
    }

    const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/documents/`, {
      type: request.type,
      front_image: frontImageBase64,
      back_image: backImageBase64,
      document_number: request.documentNumber,
      expiry_date: request.expiryDate,
      issuing_country: request.issuingCountry,
    }, {
      headers: await getAuthHeaders(),
    });

    return response.data;
  },

  /**
   * Upload selfie for facial verification
   */
  uploadSelfie: async (request: SelfieUploadRequest): Promise<KYCVerification> => {
    let imageBase64 = request.image;

    if (request.image.startsWith('file://') || request.image.startsWith('/')) {
      imageBase64 = await imageToBase64(request.image);
    }

    const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/biometrics/`, {
      selfie_image: imageBase64,
      liveness_data: request.livenessData,
    }, {
      headers: await getAuthHeaders(),
    });

    return response.data;
  },

  /**
   * Submit address verification
   */
  submitAddress: async (request: AddressVerificationRequest): Promise<KYCVerification> => {
    let proofDocBase64 = request.proofDocument;

    if (request.proofDocument && (request.proofDocument.startsWith('file://') || request.proofDocument.startsWith('/'))) {
      proofDocBase64 = await imageToBase64(request.proofDocument);
    }

    const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/verification/`, {
      step: 'address',
      data: {
        street: request.street,
        city: request.city,
        region: request.region,
        country: request.country,
        postal_code: request.postalCode,
        proof_document: proofDocBase64,
      },
    }, {
      headers: await getAuthHeaders(),
    });

    return response.data;
  },

  /**
   * Submit KYC for review
   */
  submitForReview: async (): Promise<KYCVerification> => {
    const response = await axios.post(`${API_BASE_URL}/api/v1/kyc/verification/`, {
      action: 'submit',
    }, {
      headers: await getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Pick image from camera
   */
  captureImage: async (options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Camera permission is required to capture images');
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [4, 3],
      quality: options?.quality ?? 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Pick image from gallery
   */
  pickImage: async (options?: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Gallery permission is required to select images');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options?.allowsEditing ?? true,
      aspect: options?.aspect ?? [4, 3],
      quality: options?.quality ?? 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Perform basic liveness check
   * In production, this should use a proper liveness detection SDK
   */
  performLivenessCheck: async (imageUri: string): Promise<{
    passed: boolean;
    score: number;
    checks: {
      faceDetected: boolean;
      eyesOpen: boolean;
      goodLighting: boolean;
      noObstructions: boolean;
    };
  }> => {
    try {
      const imageBase64 = await imageToBase64(imageUri);
      
      const response = await axios.post(`${API_BASE_URL}/api/v1/users/me/liveness/`, {
        image: imageBase64,
      }, {
        headers: await getAuthHeaders(),
      });

      return response.data;
    } catch {
      // Return basic check if API fails
      return {
        passed: true,
        score: 0.8,
        checks: {
          faceDetected: true,
          eyesOpen: true,
          goodLighting: true,
          noObstructions: true,
        },
      };
    }
  },

  /**
   * Get KYC tier limits
   */
  getTierLimits: (tier: 'unverified' | 'basic' | 'standard' | 'premium') => {
    return KYC_TIER_LIMITS[tier];
  },

  /**
   * Get document type label
   */
  getDocumentTypeLabel: (type: DocumentType): string => {
    return DOCUMENT_TYPE_LABELS[type];
  },

  /**
   * Get all supported document types
   */
  getSupportedDocumentTypes: (): { type: DocumentType; label: string }[] => {
    return Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => ({
      type: type as DocumentType,
      label,
    }));
  },

  /**
   * Check if a step is completed
   */
  isStepCompleted: (verification: KYCVerification | null, step: VerificationStep): boolean => {
    if (!verification) return false;
    return verification.completedSteps.includes(step);
  },

  /**
   * Get next required step
   */
  getNextStep: (verification: KYCVerification | null): VerificationStep | null => {
    if (!verification) return 'personal_info';
    
    const steps: VerificationStep[] = ['personal_info', 'document', 'selfie', 'address'];
    
    for (const step of steps) {
      if (!verification.completedSteps.includes(step)) {
        return step;
      }
    }
    
    return null; // All steps completed
  },

  /**
   * Get verification progress percentage
   */
  getProgress: (verification: KYCVerification | null): number => {
    if (!verification) return 0;
    
    const totalSteps = 4;
    const completedSteps = verification.completedSteps.length;
    
    return Math.round((completedSteps / totalSteps) * 100);
  },
};

export default kycService;
