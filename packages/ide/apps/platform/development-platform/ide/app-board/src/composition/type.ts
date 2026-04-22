import { Ref } from "vue";

export interface RawAppDataItem {
    id: string;
    code: string;
    name: string;
    description: string;
    refSUCode: string;
    parentID: string;
    sortOrder: number;
    isDetail: string;
    layer: number;
    userId: string;
    wsId: string;
    type: string;
    sysInit: string;
}

export interface AppObject {
    id: string;
    code: string;
    name: string;
    description: string;
    userId: string;
}

export interface AppModule {
    id: string;
    code: string;
    name: string;
    description: string;
    refSUCode: string;
    apps: AppObject[]
}

export interface AppDomain {
    id: string;
    code: string;
    name: string;
    description: string;
    modules: AppModule[]
}

export interface UseAppDomain {

    appDomains: Ref<AppDomain[]>;

    appDomainMap: Map<string, any>;

    currentAppDomain: Ref<AppDomain>;

    currentAppModule: Ref<AppModule>;

    currentAppObjects: Ref<AppObject[]>;

    generateAppDomain: (appSourceUri: string) => void;

    setAppDomainSourceUri: (dataUri: string) => void;

    updateAppDomain: () => void;
}

export interface AppConfigOptions {

    appDataSourceUri: string;

    appTitle?: string;

    sceneId?: number;

}

export interface UseAppConfig {

    options: AppConfigOptions;

    initialize: () => Promise<any>
}

export interface WorkspaceOptions {
    id: string;
    code: string;
    name: string;
    productId: string | null;
    paas: boolean;
    location: string;
    activated: boolean;
    role: string;
    creator: string;
    createdTime: string;
    lastModifier: string;
    lastModifiedTime: string;
}

export interface UseWorkspace {

    options: WorkspaceOptions;

    initialize: () => Promise<any>
}