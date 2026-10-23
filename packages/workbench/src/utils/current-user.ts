import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

let currentUserId: Promise<string> | undefined;

export function getCurrentUserId(): Promise<string> {
  if (!currentUserId) {
    currentUserId = axios.get('/api/runtime/sys/v1.0/userinfos/data', {
      timeout: 15000,
      withCredentials: true
    }).then(({ data }) => {
      const userId = data?.userInfo?.userId;
      if (typeof userId !== 'string' || !userId.trim() || userId.trim().length > 128) {
        throw new Error('未获取到有效的用户身份，请重新登录运行环境后刷新页面');
      }
      return userId.trim();
    }).catch(() => {
      currentUserId = undefined;
      throw new Error('获取当前用户失败，请确认已登录运行环境后刷新页面');
    });
  }
  return currentUserId;
}

export async function withCurrentUser(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
  config.params = { ...config.params, userId: await getCurrentUserId() };
  return config;
}
