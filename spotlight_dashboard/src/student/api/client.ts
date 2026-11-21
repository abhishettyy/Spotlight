
import axios from 'axios';
import { studentUrl } from '@student/basePath';

const BASE_URL = (() => {
  let base = String(import.meta.env.VITE_API_URL || 'https://spotlight-backend-x0q7.onrender.com/api')
    .replace(/\s+/g, '')
    .replace(/\/+$/, '');
  if (!base.endsWith('/api')) base += '/api';
  return base;
})();

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  config.headers['ngrok-skip-browser-warning'] = 'true';
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    const sentToken = !!error.config?.headers?.['Authorization'];
    if (error.response?.status === 401 && sentToken && !url.startsWith('/auth/')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userId');
      window.location.href = studentUrl('/login');
    }
    return Promise.reject(error);
  }
);

export function formatApiError(error: unknown, defaultMsg: string): string {
  if (!error) return defaultMsg;

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    const msg = error.response.data?.error ?? error.response.data?.message;
    if (typeof msg === 'string' && msg) return cleanServerMessage(msg);
    if (error.response.status >= 500) {
      return 'An unexpected server error occurred. Please try again later.';
    }
    return defaultMsg;
  }

  return cleanServerMessage(String(error)) || defaultMsg;
}

function cleanServerMessage(msg: string): string {
  const errStr = msg.toLowerCase();

  if (errStr.includes('network error') || errStr.includes('econnrefused') ||
      errStr.includes('failed to fetch') || errStr.includes('timeout')) {
    return 'Connection error. Please check your internet connection and try again.';
  }
  if (errStr.includes('user_not_found') || errStr.includes('invalid_credentials') ||
      errStr.includes('invalid password') || errStr.includes('wrong password') ||
      errStr.includes('invalid email or password')) {
    return 'Invalid email address or password. Please try again.';
  }
  if (errStr.includes('already_exists') || errStr.includes('email already in use') ||
      errStr.includes('user already exists')) {
    return 'An account with this email address already exists.';
  }
  if (errStr.includes('internal server error') || errStr.includes('prisma') ||
      errStr.includes('p2002') || errStr.includes('p2003') || errStr.includes('constraint') ||
      errStr.includes('syntaxerror') || errStr.includes('typeerror') ||
      errStr.includes('postgres') || errStr.includes('sqlite') || errStr.includes('database')) {
    return 'An unexpected server error occurred. Please try again later.';
  }
  return msg.replace(/^Error:\s*/i, '');
}

export default apiClient;
