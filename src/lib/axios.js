import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore.js';
export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL, // Keep just the base URL
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to handle cookies
axiosInstance.interceptors.request.use(config => {
  // Ensure cookies are sent with all requests
  config.withCredentials = true;
  return config;
}, error => {
  return Promise.reject(error);
});

// Update response interceptor
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      // Handle 401 specifically
      if (error.response.status === 401) {
        console.error("Authentication error");
        // Clear auth state
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);
