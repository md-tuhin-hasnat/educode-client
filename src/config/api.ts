import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * EduCode API Base Configuration
 * Uses environment variable NEXT_PUBLIC_API_URL if defined,
 * defaulting to local development server at http://localhost:4000/api/v1.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

/**
 * Returns the base origin of the server (e.g., http://localhost:4000) for display or assets.
 */
export const SERVER_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const user = useAuthStore.getState().user;
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const user = useAuthStore.getState().user;
      if (user?.refreshToken) {
        try {
          // Attempt to refresh the token using a standard axios instance
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: user.refreshToken,
          });

          const newAccessToken = data.accessToken;
          const newRefreshToken = data.refreshToken;

          // Update store
          const newSession = { ...user, token: newAccessToken, refreshToken: newRefreshToken };
          useAuthStore.getState().login(newSession);

          processQueue(null, newAccessToken);
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
          
          isRefreshing = false;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          console.warn('[API Client] Token refresh failed. Clearing session...');
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } else {
        isRefreshing = false;
        console.warn('[API Client] Unauthorized request (401). Clearing session...');
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

