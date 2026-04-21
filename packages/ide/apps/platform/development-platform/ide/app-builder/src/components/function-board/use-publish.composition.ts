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

/** 发布流程归集参数（App 以当前业务对象标识为键，不再使用页面流元数据标识） */
export interface PublishMenuExecutionParams {
    /** 业务对象标识，对应 GET/POST gspapp、PUT gspapp、发布菜单 payload 中的 app 维度 id */
    businessObjectId: string;
    projectPath: string;
    metadataReliedPath: string;
    pageFlowContent: PageFlowContent | null;
    /** GET gspapp/:businessObjectId 的结果 */
    appPublishRecordBeforePublish: AppPublishRecord | null;
    /** 当前要发布的页面入口（页面流 pages 或 Form 摘要构造） */
    targetPage: PageFlowPage;
    /** 表单：产品/模块/分组/菜单类型等 */
    form: PublishMenuForm;
    appUrl: string;
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
    /** 从查询 APP 发布记录起执行后续步骤并发布（不在此拉取页面流元数据） */
    publishMenu: () => Promise<boolean>;
    /** 从 GET gspapp/:boId 起归集参数（使用 workspace 业务对象标识） */
    collectPublishMenuExecutionParams: () => Promise<PublishMenuExecutionParams | null>;
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

    /** Step 3: 查询 APP 发布记录（以业务对象标识为 App id） */
    async function queryAppPublishRecord(businessObjectId: string): Promise<AppPublishRecord | null> {
        try {
            const uri = `/api/runtime/sys/v1.0/gspapp/${businessObjectId}`;
            const response = await axios.get(uri);
            if (response.data && response.data.id) {
                return response.data as AppPublishRecord;
            }
            return null;
        } catch {
            return null;
        }
    }

    /** 与菜单、缓存查询一致：功能入口与页面元数据共用同一标识（优先 formUri，否则 page.id） */
    function resolvePageMetadataId(page: PageFlowPage): string {
        const uri = page.formUri;
        if (uri !== undefined && uri !== null && String(uri).trim() !== '') {
            return String(uri);
        }
        return page.id;
    }

    function getBoParentIdForPublish(row: Record<string, any>): string {
        const pid = row.parentID ?? row.parentId ?? row.ParentID ?? row.ParentId;
        return pid === undefined || pid === null ? '' : String(pid);
    }

    /** 通过 bolistwithlock 解析关键应用、模块（与菜单摘要一致，不使用 business-objects/.../ancestors） */
    async function loadAncestorInfo(): Promise<void> {
        try {
            const boId = options.boId;
            if (!boId) {
                return;
            }
            const uri = '/api/runtime/sys/v1.0/business-objects-lock/bolistwithlock';
            const response = await axios.get(uri);
            const raw = response.data;
            const list = (Array.isArray(raw) ? raw : (raw?.items || raw?.data || [])) as Record<string, any>[];
            if (!list.length) {
                return;
            }
            const idMap = new Map<string, Record<string, any>>();
            for (const row of list) {
                if (row?.id) {
                    idMap.set(String(row.id), row);
                }
            }
            const current = idMap.get(String(boId));
            if (!current) {
                return;
            }
            const moduleId = getBoParentIdForPublish(current);
            const moduleRow = moduleId ? idMap.get(moduleId) : undefined;
            if (!moduleRow) {
                return;
            }
            const productId = getBoParentIdForPublish(moduleRow);
            const productRow = productId ? idMap.get(productId) : undefined;
            if (!productRow) {
                return;
            }
            ancestorInfo.value.productId = String(productRow.id || '');
            ancestorInfo.value.productName = String(productRow.name || '');
            ancestorInfo.value.moduleId = String(moduleRow.id || '');
            ancestorInfo.value.moduleName = String(moduleRow.name || '');
            publishForm.value.productId = ancestorInfo.value.productId;
            publishForm.value.productName = ancestorInfo.value.productName;
            publishForm.value.moduleId = ancestorInfo.value.moduleId;
            publishForm.value.moduleName = ancestorInfo.value.moduleName;
        } catch {
            // bolistwithlock 失败则保留表单中的默认/空值
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

        const boId = options.boId;
        if (!boId) {
            publishState.value = {
                published: false,
                showForm: false,
                loading: false,
                appRecord: null,
                matchedInvoke: null,
                functionRecord: null
            };
            return;
        }

        const appRecord = await queryAppPublishRecord(boId);
        await loadAncestorInfo();

        if (appRecord && appRecord.appInvoks) {
            const metadataId = resolvePageMetadataId(page);
            const matchedInvoke = appRecord.appInvoks.find(
                (inv: AppInvoke) => inv.code === page.code || inv.id === metadataId
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

    /** Step 4: 创建 App（id = 业务对象标识） */
    async function createApp(): Promise<boolean> {
        const page = currentPage.value!;
        const appId = options.boId;
        const payload = {
            id: appId,
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

    /** Step 5: 填写 AppInvoke（PUT gspapp），在已有 appInvoks 上合并/更新当前入口 */
    async function updateAppInvoke(existingApp: AppPublishRecord | null): Promise<AppInvoke> {
        const page = currentPage.value!;
        const appId = options.boId;
        const metadataId = resolvePageMetadataId(page);
        const baseInvoks = existingApp?.appInvoks ? [...existingApp.appInvoks] : [];
        const existingIndex = baseInvoks.findIndex(
            (inv: AppInvoke) => inv.code === page.code || inv.id === metadataId
        );
        const invokeId = metadataId;
        const invoke: AppInvoke = {
            appEntrance: page.code,
            appId: appId,
            code: page.code,
            id: invokeId,
            name: page.name
        };
        if (existingIndex >= 0) {
            baseInvoks[existingIndex] = invoke;
        } else {
            baseInvoks.push(invoke);
        }
        const appCode = existingApp?.code || page.code;
        const appName = existingApp?.name || page.name;
        const nameLanguage = existingApp?.nameLanguage || { 'zh-CHS': appName };
        const payload = {
            id: appId,
            code: appCode,
            name: appName,
            nameLanguage,
            layer: existingApp?.layer ?? 4,
            url: existingApp?.url || buildAppUrl(),
            bizObjectId: existingApp?.bizObjectId || options.boId,
            appInvoks: baseInvoks,
            parentId: existingApp?.parentId ?? '0'
        };
        await axios.put('/api/runtime/sys/v1.0/gspapp', payload);
        return invoke;
    }

    /**
     * Step 6: 创建菜单分组。
     * 用户只需填写分组名称：自动生成 GUID 作为分组 id，POST 创建分组并回写 form.groupId。
     * 未填名称时，若表单上已有 groupId（例如只读回显）则直接返回该 id。
     */
    async function createMenuGroup(): Promise<string> {
        const form = publishForm.value;
        const existingId = (form.groupId || '').trim();
        /** 已有分组（如从上级菜单回填）：直接使用，不再 POST 新建 */
        if (existingId && !form.groupIsNew) {
            return existingId;
        }
        const name = form.groupName?.trim();
        if (!name) {
            return '';
        }
        const groupId = generateUUID();
        const payload = {
            id: groupId,
            parentId: form.moduleId,
            code: name,
            funcType: '3',
            isDetail: true,
            isSysInit: false,
            layer: '3',
            menuType: '0',
            name: name,
            nameLanguage: { 'zh-CHS': name },
            description: ''
        };
        await axios.post('/api/runtime/sys/v1.0/functions', payload);
        publishForm.value.groupId = groupId;
        return groupId;
    }

    /** Step 7: 发布功能菜单（功能菜单记录 id 与页面元数据 id 一致，便于 funcOperations 与 Form 对齐） */
    async function publishFunction(invoke: AppInvoke, groupId: string): Promise<boolean> {
        const form = publishForm.value;
        const page = currentPage.value!;
        const appId = options.boId;
        const functionId = resolvePageMetadataId(page);
        const payload = {
            productId: form.productId,
            moduleId: form.moduleId,
            groupId: groupId,
            appId: appId,
            appInvokId: invoke.id,
            bizObjectId: options.boId,
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

    /** 在已得到 appRecord（GET gspapp）时，归集后续发布用到的参数快照 */
    function buildPublishMenuExecutionParams(appRecord: AppPublishRecord | null): PublishMenuExecutionParams | null {
        const page = currentPage.value;
        const businessObjectId = options.boId;
        if (!page || !businessObjectId) {
            return null;
        }
        const projectPath = `${options.path}/metadata`;
        const metadataReliedPath = `${options.path}/metadata/components`;
        return {
            businessObjectId,
            projectPath,
            metadataReliedPath,
            pageFlowContent: pageFlowContent.value,
            appPublishRecordBeforePublish: appRecord,
            targetPage: page,
            form: { ...publishForm.value },
            appUrl: buildAppUrl()
        };
    }

    /**
     * 从查询 APP 发布记录开始归集参数（不在此处请求 app-config / metadatas/relied）。
     * 使用 workspace 中的业务对象标识作为 gspapp 主键。
     */
    async function collectPublishMenuExecutionParams(): Promise<PublishMenuExecutionParams | null> {
        if (!currentPage.value) {
            return null;
        }
        if (!options.boId) {
            return null;
        }
        const appRecord = await queryAppPublishRecord(options.boId);
        return buildPublishMenuExecutionParams(appRecord);
    }

    /**
     * 发布编排（App 以业务对象标识为键）：
     * 1 GET gspapp/:boId（归集参数）
     * →（无记录则）2 POST gspapp → 3 PUT gspapp（AppInvoke）→ 4 POST functions（新建分组）→ 5 POST functions（发布菜单）
     */
    async function publishMenu(): Promise<boolean> {
        if (!currentPage.value) {
            return false;
        }
        publishState.value.loading = true;
        try {
            const params = await collectPublishMenuExecutionParams();
            if (!params) {
                publishState.value.loading = false;
                return false;
            }
            const bizId = params.businessObjectId;
            let appRecord = params.appPublishRecordBeforePublish;
            publishState.value.appRecord = appRecord;

            // —— Step 2：若无发布记录则创建 App —— POST gspapp（id = 业务对象标识）
            if (!appRecord) {
                const created = await createApp();
                if (!created) {
                    publishState.value.loading = false;
                    return false;
                }
                appRecord = await queryAppPublishRecord(bizId);
                publishState.value.appRecord = appRecord;
                if (!appRecord) {
                    publishState.value.loading = false;
                    return false;
                }
            }

            // —— Step 3：填写 AppInvoke —— PUT gspapp
            const invoke = await updateAppInvoke(appRecord);

            // —— Step 4：创建菜单分组（若新建）—— POST functions
            const groupId = await createMenuGroup();
            if (!groupId) {
                publishState.value.loading = false;
                return false;
            }

            // —— Step 5：发布功能菜单 —— POST functions
            const result = await publishFunction(invoke, groupId);

            if (result) {
                publishState.value.published = true;
                publishState.value.matchedInvoke = invoke;
                publishState.value.appRecord = await queryAppPublishRecord(bizId);
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
        publishMenu,
        collectPublishMenuExecutionParams
    };
}
