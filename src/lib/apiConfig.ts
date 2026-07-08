const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

// Default to the production backend URL on Cloud Run, but override with env variable if present (like in local development)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backbelakang-12178843429.asia-southeast1.run.app';

/**
 * Helper to get the correct HTTP API URL
 */
export const getApiUrl = (path: string = ''): string => {
  // Ensure we don't double slash if path starts with slash and base ends with it
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/**
 * Helper to get the correct WebSocket URL based on the API base URL
 */
export const getWsUrl = (path: string = ''): string => {
  // Replace http:// or https:// with ws:// or wss://
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  const base = wsBase.endsWith('/') ? wsBase.slice(0, -1) : wsBase;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};
