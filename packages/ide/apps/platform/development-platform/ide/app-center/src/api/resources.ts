import { getCurrentUser as getRuntimeUser } from '../../../../../../../src/utils/current-user';
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
    /** 是否为改造前创建的共享配置（首次进入租户时从基础数据复制而来） */
    inherited?: boolean;
    createdAt?: string;
    updatedAt?: string;
    hasPassword?: boolean;
}

/** 当前登录用户（平台接口 /api/runtime/sys/v1.0/userinfos/data） */
export interface CurrentUser {
    id: string;
    userId: string;
    code?: string;
    name?: string;
    /** 租户ID（平台多租户标识，页面按它做数据隔离） */
    tenantId?: number | string;
    tenantName?: string;
}

/** REST 配置的请求方法 */
export type RestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/** REST 配置的认证方式 */
export type RestAuthType = 'none' | 'apiKey' | 'bearer';
/** ApiKey 的携带位置：header=请求头，query=查询参数，body=请求体（POST/PUT/PATCH 进 JSON 请求体，GET/DELETE 兜底为查询串） */
export type ApiKeyPlacement = 'header' | 'query' | 'body';

/** 一条集成REST配置（列表接口不返回密钥，只有 hasApiKeyValue / hasBearerToken） */
export interface RestConfigItem {
    id: string;
    code: string;
    name: string;
    visibility: MailVisibility;
    url: string;
    method: RestMethod;
    authType: RestAuthType;
    apiKeyPlacement?: ApiKeyPlacement;
    apiKeyName?: string;
    headersText?: string;
    contentType?: string;
    timeoutMs?: number;
    description?: string;
    ownerId?: string;
    ownerUserId?: string;
    ownerCode?: string;
    ownerName?: string;
    /** 是否为改造前创建的共享配置（首次进入租户时从基础数据复制而来） */
    inherited?: boolean;
    createdAt?: string;
    updatedAt?: string;
    hasApiKeyValue?: boolean;
    hasBearerToken?: boolean;
}

/** 取当前登录用户信息；页面用它的 id 做「个人配置」的归属判断 */
export function getCurrentUser(): Promise<CurrentUser> {
    return getRuntimeUser().then((user) => ({ ...user, id: user.userId }));
}

/** 列出当前用户在本租户可见的邮件配置：公共 + 本人的个人配置 */
export function listMailConfigs(userId: string, tenantId: string): Promise<{ ok: boolean; configs: MailConfigItem[] }> {
    return axios.get(`${BASE}/resources/mail`, { params: { userId, tenantId } }).then((res) => res.data);
}

/** 新建/更新邮件配置。password 传明文，这里负责用服务端公钥加密后再发送 */
export function saveMailConfig(payload: Record<string, any>, publicKey: string, tenantId: string): Promise<{ ok: boolean; config: MailConfigItem }> {
    const body: Record<string, any> = { ...payload, tenantId };
    if (body.password) {
        body.password = rsaEncryptWithKey(String(body.password), publicKey);
    } else {
        delete body.password;
    }
    return axios.post(`${BASE}/resources/mail`, body).then((res) => res.data);
}

/** 删除邮件配置（仅创建者） */
export function deleteMailConfig(id: string, userId: string, tenantId: string): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/resources/mail/delete`, { id, userId, tenantId }).then((res) => res.data);
}

/** 列出当前用户在本租户可见的 REST 配置：公共 + 本人的个人配置 */
export function listRestConfigs(userId: string, tenantId: string): Promise<{ ok: boolean; configs: RestConfigItem[] }> {
    return axios.get(`${BASE}/resources/rest`, { params: { userId, tenantId } }).then((res) => res.data);
}

/** 新建/更新 REST 配置。apiKeyValue / bearerToken 传明文，这里负责加密后再发送；留空表示不修改 */
export function saveRestConfig(payload: Record<string, any>, publicKey: string, tenantId: string): Promise<{ ok: boolean; config: RestConfigItem }> {
    const body: Record<string, any> = { ...payload, tenantId };
    for (const field of ['apiKeyValue', 'bearerToken']) {
        if (body[field]) {
            body[field] = rsaEncryptWithKey(String(body[field]), publicKey);
        } else {
            delete body[field];
        }
    }
    return axios.post(`${BASE}/resources/rest`, body).then((res) => res.data);
}

/** 删除 REST 配置（仅创建者） */
export function deleteRestConfig(id: string, userId: string, tenantId: string): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/resources/rest/delete`, { id, userId, tenantId }).then((res) => res.data);
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
