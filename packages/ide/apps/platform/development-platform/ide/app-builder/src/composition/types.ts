import { Ref } from "vue";

export interface FunctionGroupItem {
    id: string;
    appDomain: string;
    appModule: string;
    appGroup: string;
    category: string;
    code: string;
    name: string;
    menuPath: string;
    url: string;
}

export interface FunctionItem {
    id: string;
    appDomain: string;
    appModule: string;
    appGroup: string;
    category: string;
    code: string;
    name: string;
    menuPath: string;
    url: string;
}

export interface FunctionInstance {
    instanceId: string;
    functionId: string;
    code: string;
    name: string;
    url: string;
    icon?: string;
    fix?: boolean
}

export interface FunctionGroup {
    id: string;
    code: string;
    name: string;
    menuPath: string;
    functionGroupItems: FunctionGroupItem[]
}

export interface MenuGroupItem {
    id: string;
    code: string;
    name: string;
    menuPath: string;
    functions: FunctionItem[];
    functionGroups: FunctionGroup[];
}

export interface MenuGroup {
    id: string;
    code: string;
    name: string;
    icon: string;
    items: MenuGroupItem[]
}

export interface UseFunctionInstance {

    activeInstanceId: Ref<string>;

    close: (functionInstanceId: string) => void;

    functionInstances: Ref<FunctionInstance[]>;

    open: (functionItem: FunctionItem) => void;

    openFile: (path: string) => void;

    openUrl: (functionId: string, code: string, name: string, functionUrl: string) => void;

    setResidentInstance: (functions: FunctionInstance[]) => void;
}

export interface UseMenuData {

    menuData: Ref<MenuGroup[]>;

    menuMap: Map<string, any>;

    generateFunctionMenu: (functionSourceUri: string) => void;
}

export interface WorkAreaInstance {

    id: string;

    code: string;

    name: string;

    functions: FunctionInstance[];

    showHeader: boolean;
}

export interface ConfigOptions {
    title: string;

    emptyFunctionPage: string;

    functionSourceUri: string;

    residentWorkAreas: WorkAreaInstance[];

    residentFunctions: FunctionInstance[];

    resolveFunctionUri: string;

    workAreaSourceUri: string;
}

export interface UseConfig {

    options: ConfigOptions;

    initialize: () => Promise<any>
}

export interface WorkAreaItem {
    id: string;
    code: string;
    name: string;
    menuPath: string;
    url: string;
}

export interface UseWorkAreaInstance {

    activeInstanceId: Ref<string>;

    activeWorkAreaInstance: (workAreaId: string) => void;

    loadWorkAreaConfiguration: (workAreaSourceUri: string) => void;

    workAreaInstances: Ref<WorkAreaInstance[]>;

    workAreaInstanceMap: Map<string, any>;

    setResidentInstance: (residentInstances: WorkAreaInstance[]) => void;
}

export interface WorkspaceOptions {
    path: string;
    appId: string;
    appCode: string;
    appName: string;
    boId: string;
    workspaceId: string;
    version: string;
    location: string;
}

export interface UseWorkspace {

    options: WorkspaceOptions;

    initialize: () => Promise<any>;

    open: (url: string) => void;
}
export interface UseIde {

    setDesignerStatus: (metadataId: string, isDirty: boolean) => void;

    getInitCommandData: (frameId: string) => any;

    setInitCommandData: (frameId: string, data: any) => void;
}

export interface UserInfo {
    address: string;
    code: string;
    email: string;
    id: string;
    lanName: string;
    languageId: string;
    mobilePhone: string;
    name: string;
    orgId: string;
    orgName: string;
    phone: string;
    qq: string;
    secLevel: string;
    sex: string;
    tenantId: number;
    tenantName: string;
    uentity: string | null;
    unitId: string;
    unitName: string;
    userId: string;
    userSetting: { id: string; userId: string; imgblob: string; };
    weChat: string | null;
}

export interface UseUserInfo {
    user: Ref<UserInfo>;
    initialize: () => Promise<UserInfo>;
}