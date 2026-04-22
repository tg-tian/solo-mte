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
    type: string;
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

    loadConversationFromJson: (url: string) => Promise<any>;

    openNewConversation: (conversionUri: string) => Promise<void>;

    /** 创建新的会话 */
    createConversation: (title: string, pendingMessages: any[], displayedMessages?: any[]) => any;

    /** 启动或历史加载时设置唯一默认会话（会重置页签列表） */
    setInitialConversationState: (conv: any) => void;

    /** 打开新页签并追加会话数据 */
    addConversationTab: (conv: any) => void;

    /** 若会话已存在则激活对应页签 */
    activateConversationTabByConvId: (convId: string) => void;
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
