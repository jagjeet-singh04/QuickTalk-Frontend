import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // Ensure this is set to true
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
axiosInstance.interceptors.request.use(config => {
  // Ensure credentials are sent with every request
  config.withCredentials = true;
  return config;
});
