import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等认证信息
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理网络错误
    console.error('Network Error:', error.message);
    return Promise.reject(error);
  }
);

// 定义统一的API调用结果类型
export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 统一的错误处理辅助函数
export const handleApiRequest = async <T = any>(requestFn: () => Promise<T>): Promise<ApiResult<T>> => {
  try {
    const data = await requestFn();
    return {
      success: true,
      data
    };
  } catch (error: any) {
    // 可以在这里统一处理错误，比如显示错误提示等
    console.error('API Request Error:', error || '未知错误');
    return {
      success: false,
      error: error.response.data.Message || '请求失败，请稍后重试'
    };
  }
};

// 封装GET请求
export const get = <T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.get<T>(url, { params, ...config }).then(response => response.data);
};

// 封装POST请求
export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.post<T>(url, data, config).then(response => response.data);
};

// 封装PUT请求
export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.put<T>(url, data, config).then(response => response.data);
};

// 封装DELETE请求
export const del = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return request.delete<T>(url, config).then(response => response.data);
};

export default request;
