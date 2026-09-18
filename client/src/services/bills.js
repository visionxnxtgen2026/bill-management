import api from './api';

export const billsApi = {
  list: () => api.get('/bills').then((r) => r.data),
  get: (id) => api.get(`/bills/${id}`).then((r) => r.data),
  create: (payload) => api.post('/bills', payload).then((r) => r.data),
};
