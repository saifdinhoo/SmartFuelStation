import request from './client';

export function login(credentials) {
  return request('/auth/login', { method: 'POST', body: credentials });
}

export function register(userData) {
  return request('/auth/register', { method: 'POST', body: userData });
}

export function getCurrentUser(token) {
  return request('/auth/me', { token });
}
