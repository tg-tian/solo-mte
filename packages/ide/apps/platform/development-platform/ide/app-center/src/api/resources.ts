import axios from 'axios';
import { getPublishServerConfig, rsaEncryptWithKey } from './deploy-config';

const BASE = '/solo-mte-publish';

/** 配置的可见性：public=公共（所有人可见可用），private=个人（仅创建者可见可用） */
export type MailVisibility = 'public' | 'private';

/** 一条邮件配置（列表接口不返回密码，只有 hasPassword） */
export interface MailConfigItem {
    id: string;
    code: string;
    name: string;
    visibility: MailVisibility;
    host: string;
    port: number;
    ssl: boolean;
    starttls?: boolean;
    account: string;
    senderName?: string;
    from?: string;
    connectionTimeout?: number;
    readTimeout?: number;
    writeTimeout?: number;
    maxSendCount?: number;
    ownerId?: string;
    ownerUserId?: string;
    ownerCode?: string;
    ownerName?: string;
    createdAt?: string;
    updatedAt?: string;
    hasPassword?: boolean;
}

/** 当前登录用户（平台接口 /api/runtime/sys/v1.0/userinfos?infoType=user） */
export interface CurrentUser {
    id: string;
    userId?: string;
    code?: string;
    name?: string;
}

/** 取当前登录用户信息；页面用它的 id 做「个人配置」的归属判断 */
export function getCurrentUser(): Promise<CurrentUser> {
    return axios.get('/api/runtime/sys/v1.0/userinfos?infoType=user').then((res) => res.data);
}

/** 列出当前用户可见的邮件配置：公共 + 本人的个人配置 */
export function listMailConfigs(userId: string): Promise<{ ok: boolean; configs: MailConfigItem[] }> {
    return axios.get(`${BASE}/resources/mail`, { params: { userId } }).then((res) => res.data);
}

/** 新建/更新邮件配置。password 传明文，这里负责用服务端公钥加密后再发送 */
export function saveMailConfig(payload: Record<string, any>, publicKey: string): Promise<{ ok: boolean; config: MailConfigItem }> {
    const body = { ...payload };
    if (body.password) {
        body.password = rsaEncryptWithKey(String(body.password), publicKey);
    } else {
        delete body.password;
    }
    return axios.post(`${BASE}/resources/mail`, body).then((res) => res.data);
}

/** 删除邮件配置（仅创建者） */
export function deleteMailConfig(id: string, userId: string): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/resources/mail/delete`, { id, userId }).then((res) => res.data);
}

/** 取服务端 RSA 公钥（与部署配置共用同一对密钥） */
export async function getPublicKey(): Promise<string> {
    const res = await getPublishServerConfig();
    return res.publicKey || '';
}

/** 从异常里取可展示的错误信息 */
export function resolveApiError(error: any, fallback: string): string {
    return error?.response?.data?.error || error?.message || fallback;
}
