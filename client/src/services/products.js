import api from './api';

export const productsApi = {
  list: (params = {}) => api.get('/products', { params }).then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  getUsage: (id) => api.get(`/products/${id}/usage`).then((r) => r.data),
  create: (payload) => api.post('/products', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/products/${id}`, payload).then((r) => r.data),
  restore: (id) => api.put(`/products/${id}/restore`).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
};
