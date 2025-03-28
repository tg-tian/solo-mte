import { Ref } from "vue";

export interface FunctionGroupItem {
    id: string;
    category: string;
    code: string;
    name: string;
    menuPath: string;
    url: string;
}

export interface FunctionItem {
    id: string;
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

    setResidentInstance: (functions: FunctionInstance[]) => void;
}

export interface UseMenuData {

    menuData: Ref<MenuGroup[]>;
    
    menuMap: Map<string, any>;
    
    generateFunctionMenu: (functionSourceUri: string) => void;
}

export interface ConfigOptions {
    emptyFunctionPage: string;

    functionSourceUri: string;

    residentFunctions: FunctionInstance[];

    resolveFunctionUri: string;
}

export interface UseConfig {

    options: ConfigOptions;

    initialize: () => Promise<any>
}
