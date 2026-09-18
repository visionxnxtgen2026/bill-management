import api from './api';

export const reportsApi = {
  stockSummary: (params = {}) => api.get('/reports/stock', { params }).then((r) => r.data),
  lowStock: () => api.get('/reports/low-stock').then((r) => r.data),
  outOfStock: () => api.get('/reports/out-of-stock').then((r) => r.data),
  sales: (params = {}) => api.get('/reports/sales', { params }).then((r) => r.data),
};
