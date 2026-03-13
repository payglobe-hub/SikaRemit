import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@sikaremit/mobile-shared';

export { api, configureApi, getAuthHeaders } from '@sikaremit/mobile-shared';
