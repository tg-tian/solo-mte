import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

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
        console.error('API Request Error:', error.message || '未知错误');
        return {
            success: false,
            error: error.message || '请求失败，请稍后重试'
        };
    }
};

// 封装GET请求
export const get = async <T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await request.get<T>(url, { params, ...config });
    return response.data;
};

// 封装POST请求
export const post = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await request.post<T>(url, data, config);
    return response.data;
};

// 封装PUT请求
export const put = async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await request.put<T>(url, data, config);
    return response.data;
};

// 封装DELETE请求
export const del = async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await request.delete<T>(url, config);
    return response.data;
};

export default request;
