import axios from 'axios';
import { FunctionGroup, FunctionGroupItem, FunctionItem, MenuGroup, MenuGroupItem, UseConfig, UseMenuData } from './types';
import { ref } from 'vue';

export function useMenuData(): UseMenuData {
    const idField = 'id';
    const layerField = 'layer';
    const parentIdField = 'parentId';
    const rawMenuGroupDataItemMap = new Map<string, any>();
    const rawDataItemMap = new Map<string, any>();
    const parentIdAndChildrenMap = new Map<string, any[]>();
    const menuData = ref<MenuGroup[]>([]);
    const menuMap = new Map<string, any>();

    function getField(raw: Record<string, any>, candidates: string[]): any {
        for (const key of candidates) {
            if (raw[key] !== undefined && raw[key] !== null) {
                return raw[key];
            }
        }
        return undefined;
    }

    function normalizeRawMenuItem(raw: Record<string, any>): Record<string, any> {
        const id = getField(raw, ['id', 'ID', 'Id']);
        const layer = getField(raw, ['layer', 'Layer']);
        const parentId = getField(raw, ['parentId', 'ParentId', 'parentID', 'ParentID']);
        const code = getField(raw, ['code', 'Code']) || '';
        const name = getField(raw, ['name', 'Name']) || code || '';
        const icon = getField(raw, ['icon', 'Icon']) || '';
        const menuPath = getField(raw, ['menuPath', 'MenuPath']) || '';

        return {
            ...raw,
            id: String(id ?? ''),
            layer: layer ?? '',
            parentId: parentId === undefined || parentId === null ? '' : String(parentId),
            code: String(code),
            name: String(name),
            icon: String(icon),
            menuPath: String(menuPath),
        };
    }

    function extractMenuArray(raw: unknown): any[] {
        if (Array.isArray(raw)) {
            return raw;
        }
        if (!raw || typeof raw !== 'object') {
            return [];
        }
        const record = raw as Record<string, any>;
        const candidates = [
            record.items,
            record.data,
            record.result,
            record.records,
            record.rows,
            record.list,
            record.value,
        ];
        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate;
            }
        }
        return [];
    }

    /**
     * 构造数据父子关系字典，以便于查找数据上下级关系
     * @param rawData 原始数据
     */
    function generateParentIdAndChildrenMap(rawData: any[]) {
        parentIdAndChildrenMap.clear();
        rawData.reduce((childrenMap: Map<string, any[]>, rawDataItem: any) => {
            const parentIdOfCurrent = rawDataItem[parentIdField] !== undefined ? rawDataItem[parentIdField] : '';
            const siblingsOfCurrent = childrenMap.has(parentIdOfCurrent) ? childrenMap.get(parentIdOfCurrent) as any[] : [];
            siblingsOfCurrent.push(rawDataItem);
            childrenMap.set(parentIdOfCurrent, siblingsOfCurrent);
            return childrenMap;
        }, parentIdAndChildrenMap);
    }

    /**
     * 将原始数据加载为字典，以便于检索数据
     * @param rawData 原始数据
     */
    function generateDataItemMap(rawData: any[]) {
        rawDataItemMap.clear();
        rawMenuGroupDataItemMap.clear();
        rawData.forEach((rawDataItem: Record<string, any>) => {
            const dataItemId = rawDataItem[idField];
            rawDataItemMap.set(dataItemId, rawDataItem);
        });

        const menuGroupCandidates = rawData.filter((rawDataItem: Record<string, any>) => {
            const layer = Number(rawDataItem[layerField]);
            if (layer === 1) {
                return true;
            }
            const parentId = rawDataItem[parentIdField];
            return parentId === '' || parentId === '0' || parentId === 0 || parentId === null || parentId === undefined;
        });

        menuGroupCandidates.forEach((menuGroupDataItem: Record<string, any>) => {
            rawMenuGroupDataItemMap.set(menuGroupDataItem[idField], menuGroupDataItem);
        });
    }

    /**
     * 构造功能组对象
     * @param appDomain 应用程序域。第1级应用部署结构。
     * @param appModule 应用模块。第2级应用部署结构。
     * @param rawFunctionGroup 功能组原始数据
     * @returns 功能组对象
     */
    function buildFunctionGroup(appDomain: string, appModule: string, rawFunctionGroup: Record<string, any>) {
        const { id, code, name: category, menuPath } = rawFunctionGroup;
        const appGroup = code;
        const rawFunctionItemsData = parentIdAndChildrenMap.get(id) || [];
        const functionGroupItems: FunctionGroupItem[] = rawFunctionItemsData.map((rawFunctionItemData: any) => {
            const { id, code, name, menuPath } = rawFunctionItemData;
            return { id, appDomain, appModule, appGroup, category, code, name, menuPath } as FunctionGroupItem;
        });
        return { id, code, name: category, menuPath, functionGroupItems } as FunctionGroup;
    }

    /**
     * 构造功能菜单对象
     * @param appDomain 应用程序域。第1级应用部署结构。
     * @param appModule 应用模块。第2级应用部署结构。
     * @param rawFunctionGroupsData 功能组原始数据
     * @returns 功能菜单对象
     */
    function buildFunctionItems(appDomain: string, appModule: string, rawFunctionGroupsData: Record<string, any>[]) {
        const functionItems: FunctionItem[] = [];
        rawFunctionGroupsData.reduce((functions: FunctionItem[], rawFunctionGroupData: any) => {
            const { id: functionGroupId, code: appGroup, name: category } = rawFunctionGroupData;
            const rawFunctionItemsData = parentIdAndChildrenMap.get(functionGroupId) || [];
            rawFunctionItemsData.reduce((result: FunctionItem[], rawFunctionItemData: any) => {
                const { id, code, name, menuPath } = rawFunctionItemData;
                result.push({ id, appDomain, appModule, appGroup, category, code, name, menuPath } as FunctionGroupItem);
                return result;
            }, functions);
            return functions;
        }, functionItems);
        return functionItems;
    }

    /**
     * 构造菜单项对象
     * @param appDomain 应用程序域。第1级应用部署结构。
     * @param rawMenuGroupItemData 菜单项原始数据
     * @returns 菜单项对象
     */
    function buildMenuGroupItem(appDomain: string, rawMenuGroupItemData: Record<string, any>): MenuGroupItem {
        const { id, code, name, menuPath } = rawMenuGroupItemData;
        const appModule = code;
        const rawFunctionGroupsData = parentIdAndChildrenMap.get(id) || [];
        const functionGroups: FunctionGroup[] = rawFunctionGroupsData.map((rawFunctionGroupData: any) => {
            return buildFunctionGroup(appDomain, appModule, rawFunctionGroupData);
        });
        const functions: FunctionItem[] = buildFunctionItems(appDomain, appModule, rawFunctionGroupsData);
        return { id, code, name, menuPath, functions, functionGroups } as MenuGroupItem;
    }

    /**
     * 构造菜单组对象
     * @param rawMenuGroupData 菜单组原始数据
     * @returns 菜单组对象
     */
    function buildMenuGroup(rawMenuGroupData: Record<string, any>): MenuGroup {
        const { id, code, name, icon } = rawMenuGroupData;
        const appDomain = code;
        const rawMenuGroupItemsData = parentIdAndChildrenMap.get(id) || [];
        const items: MenuGroupItem[] = rawMenuGroupItemsData.map((rawMenuGroupItemData: any) => {
            return buildMenuGroupItem(appDomain, rawMenuGroupItemData);
        });
        return { id, code, name, icon, items } as MenuGroup;

    }

    /**
     * 生成具有分组结果的功能菜单导航数据
     * @param rawMenuGroups 功能菜单原始数据
     * @returns 功能菜单对象
     */
    function generateMenuGroups(rawMenuGroups): MenuGroup[] {
        const normalizedRawMenuGroups = (Array.isArray(rawMenuGroups) ? rawMenuGroups : [])
            .map((rawItem) => normalizeRawMenuItem(rawItem));

        const isStructuredMenuGroupData = normalizedRawMenuGroups.length > 0 && normalizedRawMenuGroups.every((rawItem) => {
            return Array.isArray(rawItem.items);
        });
        if (isStructuredMenuGroupData) {
            return normalizedRawMenuGroups.map((rawMenuGroupItem: Record<string, any>) => {
                return {
                    id: String(rawMenuGroupItem.id || ''),
                    code: String(rawMenuGroupItem.code || ''),
                    name: String(rawMenuGroupItem.name || ''),
                    icon: String(rawMenuGroupItem.icon || ''),
                    items: Array.isArray(rawMenuGroupItem.items) ? rawMenuGroupItem.items : [],
                } as MenuGroup;
            });
        }

        generateDataItemMap(normalizedRawMenuGroups);
        generateParentIdAndChildrenMap(normalizedRawMenuGroups);

        const menuGroups: MenuGroup[] = Array.from(rawMenuGroupDataItemMap.values())
            .map((rawMenuGroupDataItem) => {
                return buildMenuGroup(rawMenuGroupDataItem);
            });

        return menuGroups;
    }

    /**
     * 获取功能菜单原始数据
     * @param functionSourceUri 功能菜单数据源Url
     * @returns 
     */
    function getFunctionData(functionSourceUri: string): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(functionSourceUri).then((response) => {
                const functionData = response.data;
                resolve(extractMenuArray(functionData));
            }, (error) => {
                resolve([]);
            });
        });
    }

    /**
     * 加载功能菜单对象，初始化菜单字典
     * @param functionData 功能菜单对象
     */
    function loadMenuData(functionData: any) {
        menuData.value = functionData;
        menuMap.clear();
        (menuData.value as MenuGroup[]).reduce((emptyMenuMap: Map<string, any>, menuGroup: MenuGroup) => {
            emptyMenuMap.set(menuGroup.id, ref());
            return emptyMenuMap;
        }, menuMap);
    }

    /**
     * 生成功能菜单数据
     * @param functionSourceUri 功能菜单数据源Url
     */
    function generateFunctionMenu(functionSourceUri: string) {
        getFunctionData(functionSourceUri).then((functionData: any[]) => {
            const newMenuData = generateMenuGroups(functionData);
            loadMenuData(newMenuData);
        });
    }

    return { generateFunctionMenu, menuData, menuMap };
}
