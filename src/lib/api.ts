// Centralized API configuration
// Uses VITE_API_URL environment variable in production, defaulting to http://localhost:5000 for local dev
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const API_URL = `${API_BASE_URL}/api`;

export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

export default API_BASE_URL;
