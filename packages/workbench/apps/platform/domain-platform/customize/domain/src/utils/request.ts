import axios from 'axios';

// HTTPS 走 nginx 代理，HTTP 直连 8080（兼容 dev 模式）
const getBaseURL = (): string => {
  if (typeof location !== 'undefined' && location.protocol === 'https:') {
    return '/solo-mte-8080';
  }
  return (import.meta as any).env?.VITE_BASE_PATH || '';
};

const service = axios.create({
  baseURL: getBaseURL(),
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
