import axios from 'axios';

const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

// Normalize: ensure it ends with /api if a host URL like http://localhost:5000 or https://backend.com was passed
const baseURL = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Normalize error messages so components can read err.message directly.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

export default api;
