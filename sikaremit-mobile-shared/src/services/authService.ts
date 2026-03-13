import api from './api';
import { ENDPOINTS } from '../constants/api';
import { LoginRequest, RegisterRequest, User, AuthTokens } from '../types';
import * as SecureStore from 'expo-secure-store';

interface LoginResponse extends AuthTokens {
  user: User;
}

interface RefreshResponse {
  access: string;
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post(ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post(ENDPOINTS.AUTH.LOGOUT, { refresh: refreshToken });
  },

  refreshToken: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await api.post(ENDPOINTS.AUTH.REFRESH, { refresh: refreshToken });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get(ENDPOINTS.AUTH.PROFILE);
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.patch(ENDPOINTS.AUTH.PROFILE, data);
    return response.data;
  },

  requestPasswordReset: async (email: string): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.PASSWORD_RESET, { email });
    return response.data;
  },

  confirmPasswordReset: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, {
      token,
      password: newPassword,
    });
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.PASSWORD_CHANGE, {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
    return response.data;
  },

  setupMFA: async (): Promise<{ qr_code: string; secret: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.MFA_SETUP);
    return response.data;
  },

  verifyMFA: async (code: string): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.AUTH.MFA_VERIFY, { code });
    return response.data;
  },

  getAuthHeaders: async (): Promise<Record<string, string>> => {
    try {
      // Get tokens from secure storage
      const accessToken = await SecureStore.getItemAsync('access_token');

      if (accessToken) {
        return {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
      }

      return {
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
      };
    }
  },
};

// Export getAuthHeaders as standalone function for easy importing
export const getAuthHeaders = authService.getAuthHeaders;
