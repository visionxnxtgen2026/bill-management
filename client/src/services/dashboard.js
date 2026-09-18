import api from './api';

export const dashboardApi = {
  get: () => api.get('/dashboard').then((r) => r.data),
};
