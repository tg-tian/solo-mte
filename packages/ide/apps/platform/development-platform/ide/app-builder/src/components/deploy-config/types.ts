export type RepoState = 'loading' | 'noGit' | 'noRemote' | 'ready';

export type ActiveOperation = null | 'init' | 'import' | 'addRemote' | 'commit' | 'revert' | 'auth' | 'delete';

export interface PublishServerConfig {
    address: string;
    path: string;
    port: string;
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
