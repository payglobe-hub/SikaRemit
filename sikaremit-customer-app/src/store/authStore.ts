import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens } from '../types';
import { STORAGE_KEYS } from '../constants/api';
import { authService } from '../services/authService';

// Define proper interfaces for API responses
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  error: string | null;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login: (_email: string, _password: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register: (_data: { email: string; password: string; first_name: string; last_name: string; phone: string }) => Promise<{ message: string }>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateUser: (_user: Partial<User>) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setBiometricEnabled: (_enabled: boolean) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  biometricEnabled: false,
  error: null,

  login: async (_email: string, _password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email: _email, password: _password });
      const { access, refresh, user } = response;
      
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh);
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      
      set({
        user,
        tokens: { access, refresh },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const apiError = error as ApiError;
      set({
        isLoading: false,
        error: apiError.response?.data?.message || 'Login failed. Please try again.',
      });
      throw error;
    }
  },

  register: async (_data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(_data);
      set({ isLoading: false });
      return response;
    } catch (error: unknown) {
      const apiError = error as ApiError;
      set({
        isLoading: false,
        error: apiError.response?.data?.message || 'Registration failed. Please try again.',
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
      const biometricEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED);
      
      if (accessToken && refreshToken && userData) {
        const user = JSON.parse(userData);
        set({
          user,
          tokens: { access: accessToken, refresh: refreshToken },
          isAuthenticated: true,
          biometricEnabled: biometricEnabled === 'true',
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
      set({ isLoading: false });
    }
  },

  refreshToken: async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await authService.refreshToken(refreshToken);
      const { access } = response;
      
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access);
      
      set((state) => ({
        tokens: state.tokens ? { ...state.tokens, access } : null,
      }));
    } catch (error) {
      await _get().logout();
      throw error;
    }
  },

  updateUser: (_userData: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ..._userData } : null,
    }));
  },

  setBiometricEnabled: async (_enabled: boolean) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRIC_ENABLED, _enabled.toString());
    set({ biometricEnabled: _enabled });
  },

  clearError: () => set({ error: null }),

  refreshUser: async () => {
    try {
      const response = await authService.getProfile();
      if (response) {
        set({ user: response });
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response));
      }
    } catch (error) {
      console.warn('Failed to refresh user:', error);
    }
  },
}));
