import request from './client';

export function listCategories(token) {
  return request('/categories', { token });
}

export function createCategory(token, category) {
  return request('/categories', { method: 'POST', body: category, token });
}

export function updateCategory(token, id, category) {
  return request(`/categories/${id}`, { method: 'PUT', body: category, token });
}

export function deleteCategory(token, id) {
  return request(`/categories/${id}`, { method: 'DELETE', token });
}
