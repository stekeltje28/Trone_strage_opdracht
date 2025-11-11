export const API_ORIGIN = 'http://localhost:8000';

export const apiUrl = (path) => `${API_ORIGIN}${path}`;

export const AUTH_PATHS = {
  register: '/api/v1/auth/register',
  loginForm: '/api/v1/auth/login',
  loginJson: '/api/v1/auth/login-json',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
  me: '/api/v1/auth/me',
  whoami: '/api/v1/auth/whoami',
  changePassword: '/api/v1/auth/change-password'
};

export const AUTH_ENDPOINTS = Object.fromEntries(
  Object.entries(AUTH_PATHS).map(([k, v]) => [k, apiUrl(v)])
);

export const STORAGE_KEYS = {
  accessToken: 'ps_access_token',
  refreshToken: 'ps_refresh_token',
  user: 'ps_user'
};
