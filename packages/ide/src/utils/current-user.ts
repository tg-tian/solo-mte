import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

export interface RuntimeUser {
    userId: string;
    [key: string]: any;
}

let currentUser: Promise<RuntimeUser> | undefined;

export function getCurrentUser(): Promise<RuntimeUser> {
    if (!currentUser) {
        currentUser = axios.get('/api/runtime/sys/v1.0/userinfos/data', {
            timeout: 15000,
            withCredentials: true
        }).then(({ data }) => {
            const userId = data?.userInfo?.userId;
            if (typeof userId !== 'string' || !userId.trim() || userId.trim().length > 128) {
                throw new Error('Invalid userId');
            }
            return { ...data.userInfo, userId: userId.trim() };
        }).catch(() => {
            currentUser = undefined;
            throw new Error('获取当前用户失败，请登录运行环境后刷新页面');
        });
    }
    return currentUser;
}

export async function getCurrentUserId(): Promise<string> {
    return (await getCurrentUser()).userId;
}

export async function withCurrentUser(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    config.params = { ...config.params, userId: await getCurrentUserId() };
    return config;
}
