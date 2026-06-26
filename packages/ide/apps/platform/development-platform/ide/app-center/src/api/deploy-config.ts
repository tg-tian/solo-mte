import axios from 'axios';
import JSEncrypt from 'jsencrypt';

const BASE = '/solo-mte-publish';

export interface PublishServerConfig {
    host: string;
    sshPort: number;
    sshUsername: string;
    runtimeRoot: string;
    runtimeUrl: string;
    dbType: number;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUsername: string;
}

export interface PublishServerConfigResponse {
    ok: boolean;
    config: PublishServerConfig | null;
    isComplete: boolean;
    missingHint: string;
    publicKey: string;
}

export interface QualityChecksConfig {
    baseFramework: boolean;
    dependencyInjection: boolean;
    webEndpoints: boolean;
    persistenceFramework: boolean;
}

export interface DatabaseType {
    value: number;
    name: string;
    defaultPort: number;
}

export const DATABASE_TYPES: readonly DatabaseType[] = [
    { value: 1,  name: 'PostgreSQL', defaultPort: 5432 },
    { value: 2,  name: 'SqlServer',  defaultPort: 1433 },
    { value: 3,  name: 'Oracle',     defaultPort: 1521 },
    { value: 4,  name: 'DM',         defaultPort: 5236 },
    { value: 5,  name: 'HighGo',     defaultPort: 5866 },
    { value: 6,  name: 'MySQL',      defaultPort: 3306 },
    { value: 7,  name: 'Oscar',      defaultPort: 2003 },
    { value: 8,  name: 'Kingbase',   defaultPort: 54321 },
    { value: 9,  name: 'DB2',        defaultPort: 50000 },
    { value: 10, name: 'OpenGauss',  defaultPort: 5432 },
    { value: 11, name: 'OceanBase',  defaultPort: 2881 },
];

export const DEFAULT_DB_HOST = 'localhost';

export function getDbTypeName(value: number): string {
    return DATABASE_TYPES.find(t => t.value === value)?.name || `类型${value}`;
}

export function getDbTypeDefaultPort(value: number): number {
    return DATABASE_TYPES.find(t => t.value === value)?.defaultPort || 5432;
}

export function getPublishServerConfig(): Promise<PublishServerConfigResponse> {
    return axios.get(`${BASE}/config`).then(res => res.data);
}

export function savePublishServerConfig(payload: {
    host: string;
    sshPort: number;
    sshUsername: string;
    sshPassword?: string;
    runtimeRoot: string;
    runtimeUrl: string;
    dbType: number;
    dbHost: string;
    dbPort: number;
    dbName: string;
    dbUsername: string;
    dbPassword?: string;
}): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/config`, payload).then(res => res.data);
}

export function getQualityConfig(): Promise<{ ok: boolean; config: QualityChecksConfig }> {
    return axios.get(`${BASE}/quality-config`).then(res => res.data);
}

export function saveQualityConfig(config: QualityChecksConfig): Promise<{ ok: boolean }> {
    return axios.post(`${BASE}/quality-config`, config).then(res => res.data);
}

export function rsaEncryptWithKey(plain: string, publicKey: string): string {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);
    const encrypted = encrypt.encrypt(plain);
    if (encrypted === false) {
        throw new Error('RSA 加密失败');
    }
    return encrypted;
}
