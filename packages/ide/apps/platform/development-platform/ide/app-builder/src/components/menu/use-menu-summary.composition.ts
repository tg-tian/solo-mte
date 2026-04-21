import { inject, ref, Ref } from 'vue';
import axios from 'axios';
import { UseWorkspace } from '../../composition/types';

export interface FormMetadataItem {
    id: string;
    code: string;
    name: string;
    type: string;
    fileName?: string;
    relativePath?: string;
}

/** 从功能菜单链解析出的上级分组（用于发布卡片「已有分组」） */
export interface ParentGroupInfo {
    groupId: string;
    groupName: string;
}

export interface MenuSummaryItem {
    id: string;
    metadataId: string;
    code: string;
    name: string;
    published: boolean;
    statusText: string;
    metadata: FormMetadataItem;
}

export interface MenuDetail {
    id: string;
    code: string;
    name: string;
    menuType?: string;
    bizOpId?: string;
    bizOpCode?: string;
    parentId?: string;
    staticParams?: string;
}

export interface AncestorSummary {
    productId: string;
    productName: string;
    moduleId: string;
    moduleName: string;
}

export interface UseMenuSummary {
    menuSummaryItems: Ref<MenuSummaryItem[]>;
    loadingSummary: Ref<boolean>;
    ancestorSummary: Ref<AncestorSummary>;
    /** 内存缓存：GET funcOperations/all 的完整列表（功能菜单等） */
    funcOperationsAllCache: Ref<Record<string, any>[]>;
    loadMenuSummaryItems: () => Promise<MenuSummaryItem[]>;
    /** 强制重新拉取 funcOperations/all 并刷新左侧摘要发布状态 */
    reloadFuncOperationsCache: () => Promise<void>;
    loadAncestorSummary: () => Promise<AncestorSummary>;
    queryMenuDetailByMetadataId: (metadataId: string) => Promise<MenuDetail | null>;
    /** 始终请求 GET /functions/{id}，用于切换列表时拉取最新菜单数据 */
    fetchMenuDetailFromApi: (metadataId: string) => Promise<MenuDetail | null>;
    /** 根据菜单记录上的 parentId 请求 GET /functions/{parentId}，得到菜单分组后填入表单 */
    fetchParentGroupByParentId: (parentId: string) => Promise<ParentGroupInfo | null>;
    /** 对当前摘要行逐条 GET /functions/{metadataId} 判断是否为已发布功能菜单 */
    refreshPublishedFlagsFromCache: () => Promise<void>;
    refreshPublishedStateOnly: () => Promise<void>;
}

export function useMenuSummary(): UseMenuSummary {
    const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
    const { options } = useWorkspaceComposition;

    const menuSummaryItems: Ref<MenuSummaryItem[]> = ref([]);
    const loadingSummary = ref(false);
    const funcOperationsAllCache: Ref<Record<string, any>[]> = ref([]);
    const ancestorSummary: Ref<AncestorSummary> = ref({
        productId: '',
        productName: '',
        moduleId: '',
        moduleName: ''
    });

    async function getAllFormMetadata(): Promise<FormMetadataItem[]> {
        const metadataUri = `/api/dev/main/v1.0/mdservice/ide/metadataexplore?path=${options.path}&metadataTypeList=`;
        const response = await axios.get(metadataUri);
        const metadataList = (response.data || []) as Record<string, any>[];
        return metadataList
            .filter(item => item.type === 'Form')
            .map(item => ({
                id: item.id,
                code: item.code || '',
                name: item.name || item.code || '',
                type: item.type,
                fileName: item.fileName,
                relativePath: item.relativePath
            }));
    }

    /** 一次性拉取全部功能数据并写入内存缓存 */
    async function loadFuncOperationsAllIntoCache(): Promise<void> {
        const uri = '/api/runtime/sys/v1.0/funcOperations/all';
        const response = await axios.get(uri);
        const raw = response.data;
        const list = (Array.isArray(raw) ? raw : (raw?.items || raw?.data || [])) as Record<string, any>[];
        funcOperationsAllCache.value = list;
    }

    /** 与运行时 functions 列表、Form 元数据 id 对比时统一格式（避免 string/number、GUID 大小写不一致） */
    function normFunctionId(id: unknown): string {
        return String(id ?? '')
            .trim()
            .toLowerCase();
    }

    async function reloadFuncOperationsCache(): Promise<void> {
        await loadFuncOperationsAllIntoCache();
    }

    function getBoParentId(row: Record<string, any>): string {
        const pid = row.parentID ?? row.parentId ?? row.ParentID ?? row.ParentId;
        return pid === undefined || pid === null ? '' : String(pid);
    }

    /** 通过 bolistwithlock 扁平列表：当前业务对象 → 父=模块 → 父=关键应用 */
    async function loadAncestorSummaryFromBoList(): Promise<AncestorSummary | null> {
        const uri = '/api/runtime/sys/v1.0/business-objects-lock/bolistwithlock';
        const response = await axios.get(uri);
        const raw = response.data;
        const list = (Array.isArray(raw) ? raw : (raw?.items || raw?.data || [])) as Record<string, any>[];
        if (!list.length) {
            return null;
        }
        const idMap = new Map<string, Record<string, any>>();
        for (const row of list) {
            if (row?.id) {
                idMap.set(String(row.id), row);
            }
        }
        const current = idMap.get(String(options.boId));
        if (!current) {
            return null;
        }
        const moduleId = getBoParentId(current);
        const moduleRow = moduleId ? idMap.get(moduleId) : undefined;
        if (!moduleRow) {
            return null;
        }
        const productId = getBoParentId(moduleRow);
        const productRow = productId ? idMap.get(productId) : undefined;
        if (!productRow) {
            return null;
        }
        return {
            productId: String(productRow.id || ''),
            productName: String(productRow.name || ''),
            moduleId: String(moduleRow.id || ''),
            moduleName: String(moduleRow.name || '')
        };
    }

    async function loadAncestorSummary(): Promise<AncestorSummary> {
        try {
            const fromBoList = await loadAncestorSummaryFromBoList();
            if (fromBoList) {
                ancestorSummary.value = fromBoList;
                return ancestorSummary.value;
            }
        } catch {
            // bolistwithlock 失败则回落为空
        }
        ancestorSummary.value = {
            productId: '',
            productName: '',
            moduleId: '',
            moduleName: ''
        };
        return ancestorSummary.value;
    }

    function findMenuDetailInCache(metadataId: string): MenuDetail | null {
        const want = normFunctionId(metadataId);
        const row = funcOperationsAllCache.value.find(
            (item: Record<string, any>) =>
                normFunctionId(item.id) === want && `${item.funcType || ''}` === '4'
        );
        return row ? (row as MenuDetail) : null;
    }

    function menuDetailBodyMatchesRequestedId(data: Record<string, any>, metadataId: string): boolean {
        const bodyId = data.id !== undefined && data.id !== null ? String(data.id) : '';
        const want = String(metadataId);
        return bodyId === want || bodyId.toLowerCase() === want.toLowerCase();
    }

    /**
     * GET /api/runtime/sys/v1.0/functions/:id 可能返回单条对象或对象数组；为数组时取第一条。
     */
    function normalizeFunctionsGetPayload(raw: unknown): Record<string, any> | null {
        if (raw === undefined || raw === null) {
            return null;
        }
        if (Array.isArray(raw)) {
            const first = raw[0];
            if (first && typeof first === 'object' && !Array.isArray(first)) {
                return first as Record<string, any>;
            }
            return null;
        }
        if (typeof raw === 'object') {
            return raw as Record<string, any>;
        }
        return null;
    }

    async function queryMenuDetailByMetadataId(metadataId: string): Promise<MenuDetail | null> {
        if (!metadataId) {
            return null;
        }
        const fromCache = findMenuDetailInCache(metadataId);
        if (fromCache) {
            return fromCache;
        }
        try {
            const detailUri = `/api/runtime/sys/v1.0/functions/${encodeURIComponent(metadataId)}`;
            const response = await axios.get(detailUri);
            const data = normalizeFunctionsGetPayload(response.data);
            if (!data) {
                return null;
            }
            if (menuDetailBodyMatchesRequestedId(data, metadataId)) {
                return data as MenuDetail;
            }
        } catch {
            return null;
        }
        return null;
    }

    /** 切换左侧列表时优先使用：不走路径缓存，直接 GET 当前功能菜单 */
    async function fetchMenuDetailFromApi(metadataId: string): Promise<MenuDetail | null> {
        if (!metadataId) {
            return null;
        }
        try {
            const detailUri = `/api/runtime/sys/v1.0/functions/${encodeURIComponent(metadataId)}`;
            const response = await axios.get(detailUri);
            const data = normalizeFunctionsGetPayload(response.data);
            if (!data) {
                return null;
            }
            if (menuDetailBodyMatchesRequestedId(data, metadataId)) {
                return data as MenuDetail;
            }
        } catch {
            return null;
        }
        return null;
    }

    function getParentIdFromMenuRecord(menu: Record<string, any>): string {
        const pid = menu.parentId ?? menu.ParentId ?? menu.parentID ?? menu.ParentID;
        if (pid === undefined || pid === null || pid === '') {
            return '';
        }
        return String(pid);
    }

    /** 菜单分组：用菜单数据中的 parentId 再请求上级记录并合并（不先查 funcOperations 缓存，保证与菜单接口顺序一致） */
    async function fetchParentGroupByParentId(parentId: string): Promise<ParentGroupInfo | null> {
        const pid = (parentId || '').trim();
        if (!pid) {
            return null;
        }
        try {
            const res = await axios.get(`/api/runtime/sys/v1.0/functions/${encodeURIComponent(pid)}`);
            const p = normalizeFunctionsGetPayload(res.data);
            if (!p?.id) {
                return null;
            }
            return {
                groupId: String(p.id),
                groupName: String(p.name ?? p.code ?? '')
            };
        } catch {
            return null;
        }
    }

    /** 按 id 取单条功能（先查 funcOperations/all 缓存，未命中再 GET） */
    async function fetchFunctionRecordById(recordId: string): Promise<Record<string, any> | null> {
        if (!recordId) {
            return null;
        }
        const id = String(recordId);
        const hit = funcOperationsAllCache.value.find((r: Record<string, any>) => normFunctionId(r.id) === normFunctionId(id));
        if (hit) {
            return hit;
        }
        try {
            const res = await axios.get(`/api/runtime/sys/v1.0/functions/${encodeURIComponent(id)}`);
            const row = normalizeFunctionsGetPayload(res.data);
            if (row?.id !== undefined && row?.id !== null) {
                return row;
            }
        } catch {
            return null;
        }
        return null;
    }

    /**
     * 是否存在 id 与 Form 元数据 id 一致的功能菜单：GET /functions/{metadataId}，
     * 返回体非空且 funcType 为功能菜单(4) 且 id 对齐则为已发布。
     */
    async function isMetadataPublishedAsFunctionMenu(metadataId: string): Promise<boolean> {
        const mid = (metadataId || '').trim();
        if (!mid) {
            return false;
        }
        try {
            const res = await axios.get(`/api/runtime/sys/v1.0/functions/${encodeURIComponent(mid)}`);
            const data = normalizeFunctionsGetPayload(res.data);
            if (!data) {
                return false;
            }
            if (`${data.funcType || ''}` !== '4') {
                return false;
            }
            return menuDetailBodyMatchesRequestedId(data, mid);
        } catch {
            return false;
        }
    }

    /** 对当前摘要列表逐条请求功能菜单接口，刷新「已发布」状态（不重新拉 Form 元数据列表） */
    async function refreshPublishedFlagsFromCache(): Promise<void> {
        const rows = menuSummaryItems.value;
        if (!rows.length) {
            return;
        }
        const next = await Promise.all(
            rows.map(async row => {
                const published = await isMetadataPublishedAsFunctionMenu(String(row.metadataId));
                return {
                    ...row,
                    published,
                    statusText: published ? '已发布' : '未发布'
                } as MenuSummaryItem;
            })
        );
        menuSummaryItems.value = next;
    }

    /**
     * 重新拉取 funcOperations/all 并刷新左侧「已发布」状态。
     * @param optimisticPublished 发布成功瞬间接口列表可能尚未包含新记录时，用 Form 元数据 id 先合并一条，避免匹配失败。
     */
    async function refreshPublishedStateOnly(): Promise<void> {
        await loadFuncOperationsAllIntoCache();
        await refreshPublishedFlagsFromCache();
    }

    async function loadMenuSummaryItems(): Promise<MenuSummaryItem[]> {
        loadingSummary.value = true;
        try {
            await loadFuncOperationsAllIntoCache();
            const metadataList = await getAllFormMetadata();
            const summaryItems = await Promise.all(
                metadataList.map(async metadata => {
                    const published = await isMetadataPublishedAsFunctionMenu(String(metadata.id));
                    return {
                        id: metadata.id,
                        metadataId: metadata.id,
                        code: metadata.code,
                        name: metadata.name,
                        published,
                        statusText: published ? '已发布' : '未发布',
                        metadata
                    } as MenuSummaryItem;
                })
            );
            menuSummaryItems.value = summaryItems;
            return summaryItems;
        } finally {
            loadingSummary.value = false;
        }
    }

    return {
        menuSummaryItems,
        loadingSummary,
        ancestorSummary,
        funcOperationsAllCache,
        loadMenuSummaryItems,
        reloadFuncOperationsCache,
        loadAncestorSummary,
        queryMenuDetailByMetadataId,
        fetchMenuDetailFromApi,
        fetchParentGroupByParentId,
        refreshPublishedFlagsFromCache,
        refreshPublishedStateOnly
    };
}
