import api from './api';

export const stockApi = {
  stockIn: (payload) => api.post('/stock/in', payload).then((r) => r.data),
  stockOut: (payload) => api.post('/stock/out', payload).then((r) => r.data),
  history: (params = {}) => api.get('/stock/history', { params }).then((r) => r.data),
};
