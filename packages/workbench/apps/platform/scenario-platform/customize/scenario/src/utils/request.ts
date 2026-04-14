import axios from 'axios';

const service = axios.create({
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
