import axios from 'axios'
import { authTokens } from '@/lib/utils/cookie-auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PUBLIC_AUTH_PATHS = [
  '/api/v1/accounts/login/',
  '/api/v1/accounts/register/',
  '/api/v1/accounts/refresh/',
  '/api/v1/accounts/password/reset/',
  '/api/v1/accounts/password/reset/confirm/',
  '/api/v1/accounts/verify-email/',
  '/api/v1/accounts/resend-verification/',
];

const isPublicAuthRequest = (url?: string) => {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
};

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (!isPublicAuthRequest(config.url)) {
      const token = authTokens.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Debug token presence
        console.debug('API Request:', config.method?.toUpperCase(), config.url, 'Token present:', !!token);
      } else {
        console.warn('API Request:', config.method?.toUpperCase(), config.url, 'No token found');
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh with queue support
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicAuthRequest(originalRequest.url)
    ) {
      console.warn('401 Unauthorized for:', originalRequest.method?.toUpperCase(), originalRequest.url);
      
      // If refresh is already in progress, queue the request
      if (isRefreshing) {
        console.debug('Token refresh in progress, queuing request');
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (typeof window !== 'undefined') {
          const refreshToken = authTokens.getRefreshToken();
          if (!refreshToken) {
            console.error('No refresh token available');
            authTokens.clearTokens();
            window.location.href = '/auth';
            return Promise.reject(error);
          }

          console.debug('Attempting token refresh...');
          const response = await axios.post(
            `${API_BASE_URL}/api/v1/accounts/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          authTokens.setAccessToken(access);
          console.debug('Token refresh successful');

          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          // Process queued requests
          processQueue(null, access);

          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        if (typeof window !== 'undefined') {
          authTokens.clearTokens();
          processQueue(refreshError, null);
          window.location.href = '/auth';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Merchant API functions for admin merchant management
export const merchantApi = {
  // Applications
  submitApplication: (applicationData: any) =>
    api.post('/api/v1/merchants/applications/', applicationData),

  getApplications: () =>
    api.get('/api/v1/admin/merchants/applications/'),

  approveApplication: (id: string) =>
    api.post(`/api/v1/admin/merchants/applications/${id}/approve/`),

  rejectApplication: (id: string, reason: string) =>
    api.post(`/api/v1/admin/merchants/applications/${id}/reject/`, { reason }),

  // Invitations
  getInvitations: () =>
    api.get('/api/v1/admin/merchants/invitations/'),

  createInvitation: (invitationData: any) =>
    api.post('/api/v1/admin/merchants/invitations/', invitationData),

  resendInvitation: (id: string) =>
    api.post(`/api/v1/admin/merchants/invitations/${id}/resend/`),

  cancelInvitation: (id: string) =>
    api.post(`/api/v1/admin/merchants/invitations/${id}/cancel/`),

  validateInvitation: (token: string) =>
    api.get(`/api/v1/merchants/invitations/validate/${token}/`),

  acceptInvitation: (token: string, registrationData: any) =>
    api.post(`/api/v1/merchants/invitations/accept/${token}/`, registrationData),
};

export default api;
