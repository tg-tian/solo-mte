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
