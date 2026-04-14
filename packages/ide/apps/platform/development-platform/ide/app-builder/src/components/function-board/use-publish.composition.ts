import { inject, ref, Ref } from 'vue';
import axios from 'axios';
import { UseWorkspace } from '../../composition/types';

export interface PageFlowPage {
    id: string;
    code: string;
    name: string;
    fileName: string;
    relativePath: string;
    formUri: string | null;
    routeUri: string;
    routeParams: string | null;
}

export interface PageFlowConfig {
    pageFlowMetadataID: string;
    pageFlowMetadataFileName: string;
    pageFlowMetadataPath: string;
}

export interface PageFlowContent {
    id: string;
    code: string | null;
    name: string | null;
    pages: PageFlowPage[];
    entry: string;
    project: { name: string };
}

export interface AppPublishRecord {
    id: string;
    code: string;
    name: string;
    nameLanguage: Record<string, string>;
    layer: number;
    url: string;
    bizObjectId: string;
    appInvoks: AppInvoke[];
    parentId: string;
}

export interface AppInvoke {
    appEntrance: string;
    appId: string;
    code: string;
    id: string;
    name: string;
}

export interface PublishMenuForm {
    productId: string;
    productName: string;
    moduleId: string;
    moduleName: string;
    groupId: string;
    groupName: string;
    groupIsNew: boolean;
    bizOpId: string;
    bizOpCode: string;
    menuCode: string;
    menuName: string;
    menuType: 'SysMenu' | 'QueryMenu';
    staticParams: { name: string; value: string }[];
}

export interface PublishPageState {
    published: boolean;
    showForm: boolean;
    loading: boolean;
    appRecord: AppPublishRecord | null;
    matchedInvoke: AppInvoke | null;
    functionRecord: Record<string, any> | null;
}

export interface UsePublish {
    pageFlowConfig: Ref<PageFlowConfig | null>;
    pageFlowContent: Ref<PageFlowContent | null>;
    pages: Ref<PageFlowPage[]>;
    currentPage: Ref<PageFlowPage | null>;
    publishState: Ref<PublishPageState>;
    publishForm: Ref<PublishMenuForm>;
    ancestorInfo: Ref<{ productId: string; productName: string; moduleId: string; moduleName: string }>;
    loadPageFlowConfig: () => Promise<void>;
    loadPageFlowContent: (pageFlowMetadataID: string) => Promise<void>;
    selectPage: (page: PageFlowPage) => Promise<void>;
    initNewPublish: () => void;
    publishMenu: () => Promise<boolean>;
}

export function usePublish(): UsePublish {
    const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
    const { options } = useWorkspaceComposition;

    const pageFlowConfig: Ref<PageFlowConfig | null> = ref(null);
    const pageFlowContent: Ref<PageFlowContent | null> = ref(null);
    const pages: Ref<PageFlowPage[]> = ref([]);
    const currentPage: Ref<PageFlowPage | null> = ref(null);

    const publishState: Ref<PublishPageState> = ref({
        published: false,
        showForm: false,
        loading: false,
        appRecord: null,
        matchedInvoke: null,
        functionRecord: null
    });

    const ancestorInfo = ref({
        productId: '',
        productName: '',
        moduleId: '',
        moduleName: ''
    });

    const publishForm: Ref<PublishMenuForm> = ref({
        productId: '',
        productName: '',
        moduleId: '',
        moduleName: '',
        groupId: '',
        groupName: '',
        groupIsNew: false,
        bizOpId: 'BOManager',
        bizOpCode: 'BOManager',
        menuCode: '',
        menuName: '',
        menuType: 'SysMenu',
        staticParams: []
    });

    function buildAppUrl(): string {
        const pathSegments = options.path.split('/').filter(Boolean);
        // e.g. /apps/cases/referencies/web/bo-referenceapp-front/index.html
        const urlParts = pathSegments.map(s => s.toLowerCase());
        return `/apps/${urlParts.join('/')}/index.html`;
    }

    /** Step 1: 查询页面流元数据标识 */
    async function loadPageFlowConfig(): Promise<void> {
        const projectPath = `${options.path}/metadata`;
        const uri = `/api/dev/main/v1.0/app-config?projectPath=${encodeURIComponent(projectPath)}`;
        const response = await axios.get(uri);
        pageFlowConfig.value = response.data as PageFlowConfig;
    }

    /** Step 2: 获取页面流元数据内容 */
    async function loadPageFlowContent(pageFlowMetadataID: string): Promise<void> {
        const metadataPath = `${options.path}/metadata/components`;
        const uri = `/api/dev/main/v1.0/metadatas/relied?metadataPath=${encodeURIComponent(metadataPath)}&metadataID=${pageFlowMetadataID}`;
        const response = await axios.get(uri);
        const data = response.data;
        const content: PageFlowContent = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
        pageFlowContent.value = content;
        pages.value = content.pages || [];
    }

    /** Step 3: 查询APP发布记录 */
    async function queryAppPublishRecord(pageFlowMetadataID: string): Promise<AppPublishRecord | null> {
        try {
            const uri = `/api/runtime/sys/v1.0/gspapp/${pageFlowMetadataID}`;
            const response = await axios.get(uri);
            if (response.data && response.data.id) {
                return response.data as AppPublishRecord;
            }
            return null;
        } catch {
            return null;
        }
    }

    /** 查询祖先节点（关键应用、模块） */
    async function loadAncestorInfo(): Promise<void> {
        try {
            const boId = options.boId;
            const uri = `/api/runtime/sys/v1.0/business-objects/${boId}/ancestors`;
            const response = await axios.get(uri);
            const ancestors = response.data as Record<string, any>[];
            const product = ancestors.find((a: any) => Number(a.layer) === 2);
            const module = ancestors.find((a: any) => Number(a.layer) === 3);
            if (product) {
                ancestorInfo.value.productId = product.id;
                ancestorInfo.value.productName = product.name;
                publishForm.value.productId = product.id;
                publishForm.value.productName = product.name;
            }
            if (module) {
                ancestorInfo.value.moduleId = module.id;
                ancestorInfo.value.moduleName = module.name;
                publishForm.value.moduleId = module.id;
                publishForm.value.moduleName = module.name;
            }
        } catch {
            // ancestor query failed, leave defaults
        }
    }

    /** 选择页面时，查询该页面的发布记录 */
    async function selectPage(page: PageFlowPage): Promise<void> {
        currentPage.value = page;
        publishState.value = {
            published: false,
            showForm: false,
            loading: true,
            appRecord: null,
            matchedInvoke: null,
            functionRecord: null
        };

        if (!pageFlowConfig.value) return;

        const pfId = pageFlowConfig.value.pageFlowMetadataID;
        const appRecord = await queryAppPublishRecord(pfId);
        await loadAncestorInfo();

        if (appRecord && appRecord.appInvoks) {
            const matchedInvoke = appRecord.appInvoks.find(
                (inv: AppInvoke) => inv.code === page.code
            );
            if (matchedInvoke) {
                publishState.value = {
                    published: true,
                    showForm: true,
                    loading: false,
                    appRecord,
                    matchedInvoke,
                    functionRecord: null
                };
                publishForm.value.menuCode = page.code;
                publishForm.value.menuName = page.name;
                publishForm.value.bizOpId = matchedInvoke.code || 'BOManager';
                publishForm.value.bizOpCode = matchedInvoke.code || 'BOManager';
                return;
            }
        }

        publishState.value = {
            published: false,
            showForm: false,
            loading: false,
            appRecord: appRecord,
            matchedInvoke: null,
            functionRecord: null
        };
    }

    /** 初始化新建发布 - 填充默认数据 */
    function initNewPublish(): void {
        if (!currentPage.value) return;
        publishForm.value.menuCode = currentPage.value.code;
        publishForm.value.menuName = currentPage.value.name;
        publishForm.value.bizOpId = 'BOManager';
        publishForm.value.bizOpCode = 'BOManager';
        publishForm.value.groupId = '';
        publishForm.value.groupName = '';
        publishForm.value.groupIsNew = false;
        publishForm.value.menuType = 'SysMenu';
        publishForm.value.staticParams = [];
        publishState.value.showForm = true;
    }

    function generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /** Step 4: 创建App */
    async function createApp(pfId: string): Promise<boolean> {
        const page = currentPage.value!;
        const payload = {
            id: pfId,
            code: page.code,
            name: page.name,
            nameLanguage: { 'zh-CHS': page.name },
            layer: 4,
            url: buildAppUrl(),
            bizObjectId: options.boId,
            appInvoks: [],
            parentId: '0'
        };
        const response = await axios.post('/api/runtime/sys/v1.0/gspapp', payload);
        return response.data === true || response.data === 'true';
    }

    /** Step 5: 填写AppInvoke */
    async function updateAppInvoke(pfId: string): Promise<AppInvoke> {
        const page = currentPage.value!;
        const invokeId = generateUUID();
        const invoke: AppInvoke = {
            appEntrance: page.code,
            appId: pfId,
            code: page.code,
            id: invokeId,
            name: page.name
        };
        const payload = {
            id: pfId,
            code: page.code,
            name: page.name,
            nameLanguage: { 'zh-CHS': page.name },
            layer: 4,
            url: buildAppUrl(),
            bizObjectId: options.boId,
            appInvoks: [invoke],
            parentId: '0'
        };
        await axios.put('/api/runtime/sys/v1.0/gspapp', payload);
        return invoke;
    }

    /** Step 6: 创建菜单分组（若需要新建） */
    async function createMenuGroup(): Promise<string> {
        const form = publishForm.value;
        if (!form.groupIsNew || !form.groupName) {
            return form.groupId;
        }
        const groupId = generateUUID();
        const payload = {
            id: groupId,
            parentId: form.moduleId,
            code: form.groupName,
            funcType: '3',
            isDetail: true,
            isSysInit: false,
            layer: '3',
            menuType: '0',
            name: form.groupName,
            nameLanguage: { 'zh-CHS': form.groupName },
            description: ''
        };
        await axios.post('/api/runtime/sys/v1.0/functions', payload);
        publishForm.value.groupId = groupId;
        return groupId;
    }

    /** Step 7: 发布功能菜单 */
    async function publishFunction(appId: string, invoke: AppInvoke, groupId: string): Promise<boolean> {
        const form = publishForm.value;
        const page = currentPage.value!;
        const functionId = generateUUID();
        const payload = {
            productId: form.productId,
            moduleId: form.moduleId,
            groupId: groupId,
            appId: appId,
            appInvokId: invoke.id,
            bizObjectId: 'BO',
            bizOpId: form.bizOpId,
            id: functionId,
            code: form.menuCode || page.code,
            name: form.menuName || page.name,
            nameLanguage: {
                en: form.menuCode || page.code,
                'zh-CHS': form.menuName || page.name,
                'zh-CHT': ''
            },
            creator: '',
            description: '',
            funcType: '4',
            icon: '',
            isDetail: true,
            isDisplayed: true,
            isSysInit: false,
            layer: '4',
            menuType: form.menuType,
            parentId: groupId,
            path: '',
            staticParams: JSON.stringify(form.staticParams),
            url: '',
            invokeMode: 'invokeapp',
            bizOpCode: form.bizOpCode
        };
        const response = await axios.post('/api/runtime/sys/v1.0/functions', payload);
        return response.data === true || response.data === 'true';
    }

    /** 完整发布流程 */
    async function publishMenu(): Promise<boolean> {
        if (!currentPage.value || !pageFlowConfig.value) return false;
        publishState.value.loading = true;
        try {
            const pfId = pageFlowConfig.value.pageFlowMetadataID;

            let appRecord = publishState.value.appRecord;
            if (!appRecord) {
                await createApp(pfId);
                appRecord = await queryAppPublishRecord(pfId);
            }

            const invoke = await updateAppInvoke(pfId);
            const groupId = await createMenuGroup();
            const result = await publishFunction(pfId, invoke, groupId);

            if (result) {
                publishState.value.published = true;
                publishState.value.matchedInvoke = invoke;
                publishState.value.appRecord = appRecord;
            }
            publishState.value.loading = false;
            return result;
        } catch {
            publishState.value.loading = false;
            return false;
        }
    }

    return {
        pageFlowConfig,
        pageFlowContent,
        pages,
        currentPage,
        publishState,
        publishForm,
        ancestorInfo,
        loadPageFlowConfig,
        loadPageFlowContent,
        selectPage,
        initNewPublish,
        publishMenu
    };
}
