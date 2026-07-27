import axios from 'axios';

// Single axios instance for the whole app. All backend calls should go
// through this (or a feature-specific wrapper built on top of it) so the
// base URL and auth header logic live in exactly one place.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attaches the JWT (once auth exists) to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
