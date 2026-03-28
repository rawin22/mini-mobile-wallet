import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, getActiveBaseUrl } from './config';
import { storage } from '../utils/storage';

// Navigation callback injected by AuthContext — avoids window.location in RN
let _onUnauthorized: (() => void) | null = null;
let _onSilentLogin: (() => Promise<boolean>) | null = null;

export const setUnauthorizedHandler = (handler: () => void): void => {
  _onUnauthorized = handler;
};

export const setSilentLoginHandler = (handler: () => Promise<boolean>): void => {
  _onSilentLogin = handler;
};

const redirectToLogin = (): void => {
  storage.clearAuth();
  _onUnauthorized?.();
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getActiveBaseUrl(),
  timeout: API_CONFIG.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Attach bearer token to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getActiveBaseUrl();
    const token = storage.getAccessToken();
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const paramStr = config.params ? '?' + new URLSearchParams(config.params).toString() : '';
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}${paramStr} token:${token ? 'yes' : 'NONE'}`);
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Token refresh queue for concurrent 401s
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: AxiosError | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    console.warn(`[API] ERROR ${error.response?.status ?? 'NETWORK'} ${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`, error.message);
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url ?? '';
    const isRefreshRequest = requestUrl.includes(API_CONFIG.ENDPOINTS.AUTH.REFRESH);
    const isLoginRequest = requestUrl.includes(API_CONFIG.ENDPOINTS.AUTH.LOGIN);

    // Login failures are credential errors — never try to refresh, just reject
    if (error.response?.status === 401 && isLoginRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && isRefreshRequest) {
      redirectToLogin();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = storage.getRefreshToken();
      const accessToken = storage.getAccessToken();

      if (!refreshToken || !accessToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        const { authService } = await import('./auth.service');
        const response = await authService.refreshToken(accessToken, refreshToken);

        if (response.tokens) {
          const tokenData = {
            accessToken: response.tokens.accessToken,
            refreshToken: response.tokens.refreshToken,
            expiresAt: new Date(
              Date.now() + response.tokens.accessTokenExpiresInMinutes * 60 * 1000,
            ).toISOString(),
          };
          await storage.setTokens(tokenData);
          processQueue();
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${tokenData.accessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        // Token refresh failed — try silent re-login with stored credentials before giving up
        const relogged = _onSilentLogin ? await _onSilentLogin() : false;
        if (relogged) {
          // Re-login succeeded — retry the original request with the new token
          const newToken = storage.getAccessToken();
          if (originalRequest.headers && newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          isRefreshing = false;
          return apiClient(originalRequest);
        }
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
