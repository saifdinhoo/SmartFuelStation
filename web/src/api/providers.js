import request from './client';

export function listProviders(token) {
  return request('/providers', { token });
}

export function approveProvider(token, id) {
  return request(`/providers/${id}/approve`, { method: 'PATCH', token });
}
