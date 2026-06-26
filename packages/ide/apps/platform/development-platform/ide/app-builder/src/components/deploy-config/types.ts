export type RepoState = 'loading' | 'noGit' | 'noRemote' | 'ready';

export type ActiveOperation = null | 'init' | 'import' | 'addRemote' | 'commit' | 'revert' | 'auth' | 'delete';

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

export interface QualityChecksConfig {
    baseFramework: boolean;
    dependencyInjection: boolean;
    webEndpoints: boolean;
    persistenceFramework: boolean;
}

export interface OperationStatus {
    type: 'pull' | 'push' | null;
    loading: boolean;
    success: boolean | null;
    message: string;
}

export interface PublishServerConfigResponse {
    ok: boolean;
    config: PublishServerConfig | null;
    isComplete: boolean;
    missingHint: string;
    publicKey: string;
}

export const DB_TYPE_NAME_MAP: Record<number, string> = {
    1: 'PostgreSQL',
    2: 'SqlServer',
    3: 'Oracle',
    4: 'DM',
    5: 'HighGo',
    6: 'MySQL',
    7: 'Oscar',
    8: 'Kingbase',
    9: 'DB2',
    10: 'OpenGauss',
    11: 'OceanBase',
};
