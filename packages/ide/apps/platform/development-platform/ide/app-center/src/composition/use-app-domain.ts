import axios from "axios";
import { AppDomain, AppModule, AppObject, RawAppDataItem, UseAppDomain } from "./type";
import { Ref, ref } from "vue";

export function useAppDomain(): UseAppDomain {
    const rawAppDomainDataItemMap = new Map<string, RawAppDataItem>();
    const rawAppDataItemMap = new Map<string, RawAppDataItem>();
    const parentIdAndChildrenMap = new Map<string, RawAppDataItem[]>();
    const appDomains = ref<AppDomain[]>([]);
    const appDomainMap = new Map<string, any>();
    const appDomainSourceUri = ref('');
    const currentAppDomain = ref();
    const currentAppModule = ref();
    const currentAppObjects: Ref<AppObject[]> = ref([]);

    function setAppDomainSourceUri(dataUri: string) {
        appDomainSourceUri.value = dataUri;
    }

    function updateCurrent() {
        if (!currentAppDomain.value) {
            if (appDomains.value.length) {
                currentAppDomain.value = appDomains.value[0];
            }
        } else {
            const currentAppDomainId = currentAppDomain.value.id;
            currentAppDomain.value = (appDomains.value as AppDomain[]).find((appDomain: AppDomain) => appDomain.id === currentAppDomainId);
        }
        if (!currentAppModule.value) {
            currentAppModule.value = currentAppDomain.value.modules[0];
        } else {
            const currentAppModuleId = currentAppModule.value.id;
            currentAppModule.value = (currentAppDomain.value.modules as AppModule[]).find((appModule: AppModule) => appModule.id === currentAppModuleId);
            if (!currentAppModule.value) {
                currentAppModule.value = currentAppDomain.value.modules[0];
            }
        }
        currentAppObjects.value = (currentAppModule.value as AppModule).apps;
    }

    /**
     * 将原始数据加载为字典，以便于检索数据
     * @param rawAppData 原始数据
     */
    function generateAppDataItemMap(rawAppData: RawAppDataItem[]) {
        rawAppDataItemMap.clear();
        rawAppDomainDataItemMap.clear();
        rawAppData.forEach((dataItem: RawAppDataItem) => {
            rawAppDataItemMap.set(dataItem.id, dataItem);
            if (Number(dataItem.layer) === 2 && dataItem.sysInit !== '1') {
                rawAppDomainDataItemMap.set(dataItem.id, dataItem);
            }
        });
    }

    /**
     * 构造数据父子关系字典，以便于查找数据上下级关系
     * @param rawAppData 原始数据
     */
    function generateParentIdAndChildrenMap(rawAppData: RawAppDataItem[]) {
        parentIdAndChildrenMap.clear();
        rawAppData.reduce((childrenMap: Map<string, RawAppDataItem[]>, rawDataItem: RawAppDataItem) => {
            const parentIdOfCurrent = rawDataItem.parentID !== undefined ? rawDataItem.parentID : '';
            const siblingsOfCurrent = childrenMap.has(parentIdOfCurrent) ? childrenMap.get(parentIdOfCurrent) as any[] : [];
            siblingsOfCurrent.push(rawDataItem);
            childrenMap.set(parentIdOfCurrent, siblingsOfCurrent);
            return childrenMap;
        }, parentIdAndChildrenMap);
    }

    /**
     * 构造应用模块
     * @param rawAppModuleData 应用模块原始数据
     * @returns 应用模块对象
     */
    function buildAppModule(rawAppModuleData: RawAppDataItem): AppModule {
        const { id, code, name, description } = rawAppModuleData;
        const rawAppObjectDataItems = parentIdAndChildrenMap.get(id) || [];
        const apps: AppObject[] = rawAppObjectDataItems.map((rawAppObjectDataItem: RawAppDataItem) => {
            const { id, code, name, description, userId } = rawAppObjectDataItem;
            return { id, code, name, description, userId };
        });
        return { id, code, name, description, apps } as AppModule;
    }

    /**
     * 构造应用程序域
     * @param rawAppDomainDataItem 应用程序域原始数据
     * @returns 应用程序域对象
     */
    function buildAppDomain(rawAppDomainDataItem: RawAppDataItem): AppDomain {
        const { id, code, name, description } = rawAppDomainDataItem;
        const rawAppModuleDataItems = parentIdAndChildrenMap.get(id) || [];
        const modules: AppModule[] = rawAppModuleDataItems.map((rawAppModuleData: RawAppDataItem) => {
            return buildAppModule(rawAppModuleData);
        });
        return { id, code, name, description, modules } as AppDomain;

    }

    /**
     * 构造应用程序域集合，每个应用程序域是一个独立的软件系统
     * @param rawAppData 应用信息原始数据
     * @returns 应用程序域集合
     */
    function generateAppDomains(rawAppData: RawAppDataItem[]): AppDomain[] {
        generateAppDataItemMap(rawAppData);
        generateParentIdAndChildrenMap(rawAppData);

        const menuGroups: AppDomain[] = Array.from(rawAppDomainDataItemMap.values())
            .map((rawAppDomainDataItem: RawAppDataItem) => {
                return buildAppDomain(rawAppDomainDataItem);
            });

        return menuGroups;
    }

    /**
     * 获取应用信息原始数据
     * @param appSourceUri 功能菜单数据源Url
     * @returns 
     */
    function getAppData(appSourceUri: string): Promise<any[]> {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(appSourceUri).then((response) => {
                resolve(response.data);
            }, (error) => {
                resolve([]);
            });
        });
    }

    /**
     * 加载并初始化应用程序域数据
     * @param domains 应用程序域对象集合
     */
    function loadAppDomain(domains: AppDomain[]) {
        appDomains.value = domains;
        appDomainMap.clear();
        (appDomains.value as AppDomain[]).reduce((emptyMenuMap: Map<string, any>, appDomain: AppDomain) => {
            emptyMenuMap.set(appDomain.id, ref());
            return emptyMenuMap;
        }, appDomainMap);
    }

    /**
     * 获取应用信息原始数据
     * @param appSourceUri 应用信息数据源Url
     */
    function generateAppDomain(appSourceUri: string) {
        getAppData(appSourceUri).then((rawAppData: any[]) => {
            const appDomains = generateAppDomains(rawAppData);
            loadAppDomain(appDomains);
            updateCurrent();
        });
    }

    function updateAppDomain() {
        if (appDomainSourceUri.value) {
            getAppData(appDomainSourceUri.value).then((rawAppData: any[]) => {
                const appDomains = generateAppDomains(rawAppData);
                loadAppDomain(appDomains);
                updateCurrent();
            });
        }
    }

    return { appDomains, appDomainMap, currentAppDomain, currentAppModule, currentAppObjects, generateAppDomain, setAppDomainSourceUri, updateAppDomain };
}
