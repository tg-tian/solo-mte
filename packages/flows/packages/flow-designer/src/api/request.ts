import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const request: AxiosInstance = axios.create({
    baseURL: '/api',
    timeout: 300000,
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

function getErrorMessage(error: any): string {
    let errorMessage = '请求失败，请稍后重试';

    if (error && typeof error === 'object') {
        const errorTip = error.response?.data?.Message;
        if (typeof errorTip === 'string' && errorTip) {
            errorMessage = errorTip;
        } else if (typeof error.message === 'string' && error.message) {
            errorMessage = error.message;
        }
    }

    return errorMessage;
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
        const errorMessage = getErrorMessage(error);
        console.error(`API Request Error: ${errorMessage}`, error);
        return {
            success: false,
            error: errorMessage,
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
    // 如果是流式响应，直接返回响应对象而不是response.data
    if (config?.responseType === 'stream') {
        return response as T;
    }
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
