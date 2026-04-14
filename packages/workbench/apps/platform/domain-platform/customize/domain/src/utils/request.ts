import axios from 'axios';

const service = axios.create({
  baseURL: (import.meta as any).env?.VITE_BASE_PATH || '',
  timeout: 15000
});

service.interceptors.request.use(
  (config: any) => config,
  (error) => Promise.reject(error)
);

service.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default service;
