// services/api.js — Authenticated HTTP client with RS256 JWT + refresh token rotation
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.hpsystem.vn/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── REQUEST INTERCEPTOR: attach JWT + device ID ───────────────
api.interceptors.request.use(async (config) => {
  const token    = await SecureStore.getItemAsync('accessToken');
  const deviceId = await SecureStore.getItemAsync('deviceId');
  if (token)    config.headers.Authorization = `Bearer ${token}`;
  if (deviceId) config.headers['X-Device-Id'] = deviceId;
  // Idempotency key for mutating requests
  if (['post', 'put', 'patch'].includes(config.method)) {
    config.headers['X-Idempotency-Key'] = uuidv4();
  }
  return config;
});

// ── RESPONSE INTERCEPTOR: handle 401 + token refresh ─────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry  = true;
      isRefreshing     = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        const deviceId     = await SecureStore.getItemAsync('deviceId');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken, deviceId });
        const { accessToken, refreshToken: newRefresh } = res.data;

        await SecureStore.setItemAsync('accessToken',  accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefresh);

        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear credentials — force re-login
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        // Signal app to show login screen
        if (global.onSessionExpired) global.onSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
