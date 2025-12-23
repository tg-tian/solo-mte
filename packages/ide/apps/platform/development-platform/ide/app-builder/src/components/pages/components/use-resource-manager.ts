// import { ref, Ref } from 'vue';
// import { flatten } from 'lodash-es';
// import { IdeHttpService, MetadataItem, MetadataType, LocaleService } from './types';

// export interface FilterData {
//     metadataType: any[];
//     framework: any[];
// }

// export interface UseResourceManager {
//     frameworkData: Ref<any[]>;
//     metadataTypeData: Ref<any[]>;
//     getFilters: () => void;
//     setFrameworkActive: (code: string, active?: boolean) => void;
//     setMetadataTypeActive: (code: string, active?: boolean) => void;
//     getSelectedMetadataTypes: () => string[];
//     getAllMetadata: () => Promise<MetadataItem[]>;
//     getAllMetadataTypes: () => Promise<MetadataType[]>;
//     queryIfUpdateNPM: () => Promise<any>;
//     onFilterChange: (callback: (data: FilterData) => void) => () => void;
//     boPath: string;
// }

// export function useResourceManager(
//     ideHttp: IdeHttpService,
//     localeService: LocaleService
// ): UseResourceManager {
//     const frameworkData = ref<any[]>([]);
//     const metadataTypeData = ref<any[]>([]);
    
//     const filterChangeCallbacks: Array<(data: FilterData) => void> = [];

//     const boPath = gsp.context.getValue('path');

//     // 初始化数据
//     const localeData = localeService.getValue('metadataGroup');
//     frameworkData.value = [
//         { code: 'All', name: localeData.all, active: false },
//         { code: 'Interface', name: localeData.simple, types: ['Form', 'MobileForm', 'HelpMetadata', 'GSPBusinessEntity'], active: true }
//     ];
//     metadataTypeData.value = [
//         { code: 'All', name: localeData.all, active: false },
//         { code: 'GSPBusinessEntity', name: localeData.be, types: ['GSPBusinessEntity'], active: true },
//         { code: 'GSPViewModel', name: localeData.vo, types: ['GSPViewModel'] },
//         { code: 'Form', name: localeData.form, types: ['Form'], active: true },
//         { code: 'MobileForm', name: localeData.mobileForm, types: ['MobileForm'], active: true },
//         { code: 'QueryObject', name: localeData.qo, types: ['QueryObject'] },
//         { code: 'HelpMetadata', name: localeData.help, types: ['HelpMetadata'], active: true },
//         { code: 'StateMachine', name: localeData.sm, types: ['StateMachine'] },
//         { code: 'cmp', name: localeData.cmp, types: [
//             'Component', 'WebCommand', 'BEMgrComponent', 'BEComponent',
//             'DeterminationComponent', 'ValidationComponent', 'UDTValidComponent', 'UDTDtmComponent', 'VMComponent',
//             'CommonComponent', 'WebComponent', 'WebServiceComponent', 'SourceCodeMetadata'
//         ] },
//         { code: 'res', name: localeData.res, types: ['ResourceMetadata'] },
//         { code: 'api', name: 'Api', types: ['ExternalApi', 'InternalApi', 'Event', 'Action', 'PubSub'] },
//         { code: 'DBO', name: localeData.dbo, types: ['DBO'] },
//     ];

//     function notifyFilterChange(data: FilterData) {
//         filterChangeCallbacks.forEach(callback => callback(data));
//     }

//     function onFilterChange(callback: (data: FilterData) => void): () => void {
//         filterChangeCallbacks.push(callback);
//         return () => {
//             const index = filterChangeCallbacks.indexOf(callback);
//             if (index > -1) {
//                 filterChangeCallbacks.splice(index, 1);
//             }
//         };
//     }

//     function getAllMetadata(): Promise<MetadataItem[]> {
//         return ideHttp.getAllMetadata(boPath);
//     }

//     function getAllMetadataTypes(): Promise<MetadataType[]> {
//         return ideHttp.getAllMetadataTypes();
//     }

//     function getFilters() {
//         notifyFilterChange({ framework: frameworkData.value, metadataType: metadataTypeData.value });
//     }

//     function getFrameworkActiveItems() {
//         return frameworkData.value.filter(n => n.active);
//     }

//     function getMetadataTypeActiveItems() {
//         return metadataTypeData.value.filter(n => n.active);
//     }

//     function setMetadataTypeActivesByFrameworks() {
//         const f = getFrameworkActiveItems();
//         if (f && f.length) {
//             const m = f.map(n => {
//                 if (n.types) {
//                     return n.types;
//                 }
//                 return [];
//             });

//             const _mt: any[] = flatten(m);
//             if (!_mt.length) {
//                 setMetadataTypeActive();
//             } else {
//                 metadataTypeData.value.forEach((n: any) => {
//                     n.active = _mt.includes(n.code);
//                 });
//             }
//         } else {
//             setMetadataTypeActive();
//         }

//         return metadataTypeData.value.concat();
//     }

//     function setItemStatus(data: any[], code: string = 'All', active = true) {
//         if (code === 'All') {
//             data.forEach(n => {
//                 if (n.code === 'All') {
//                     n.active = true;
//                 } else {
//                     n.active = false;
//                 }
//             });
//         } else {
//             data.forEach(n => {
//                 if (n.code === 'All') {
//                     n.active = false;
//                 } else {
//                     if (n.code === code) {
//                         n.active = active;
//                     }
//                 }
//             });
//         }

//         if (!data.filter(n => n.active).length) {
//             data.find(n => n.code === 'All').active = true;
//         }

//         return data.concat();
//     }

//     function setFrameworkActive(code: string = 'All', active = true) {
//         const f = setItemStatus(frameworkData.value, code, active);
//         const m = setMetadataTypeActivesByFrameworks();
//         frameworkData.value = f;
//         notifyFilterChange({ framework: f, metadataType: m });
//     }

//     function setMetadataTypeActive(code: string = 'All', active = true) {
//         const m = setItemStatus(metadataTypeData.value, code, active);
//         // 根据选中的类型反向更新架构选中
//         const activeItems = getMetadataTypeActiveItems();

//         if (activeItems && activeItems.length) {
//             const all = activeItems.find(n => n.code === 'All');
//             if (all && all.active) {
//                 setItemStatus(frameworkData.value, 'All', true);
//             } else {
//                 if (!active) {
//                     const f = getFrameworkActiveItems() || [];
//                     const activeCodes = activeItems.map(i => i.code);
//                     f.forEach(w => {
//                         if (w.types) {
//                             const _arr = new Set(activeCodes.concat(w.types));
//                             w.active = _arr.size < w.types.length + activeCodes.length;
//                         }
//                     });
//                 } else {
//                     const fd = frameworkData.value.find(n => (n.types || []).includes(code));
//                     if (fd) {
//                         setItemStatus(frameworkData.value, fd.code, true);
//                     }
//                 }
//             }
//         }

//         metadataTypeData.value = m;
//         notifyFilterChange({ framework: frameworkData.value, metadataType: m });
//     }

//     function getSelectedMetadataTypes() {
//         const selectedTypes = metadataTypeData.value.filter(n => n.active && n.code !== 'All').map(n => n.types);
//         return flatten(selectedTypes);
//     }

//     function queryIfUpdateNPM() {
//         return ideHttp.http.get('/api/dev/main/web/v1.0/npmpackage/nodemodulescheck/Design');
//     }

//     return {
//         frameworkData,
//         metadataTypeData,
//         getFilters,
//         setFrameworkActive,
//         setMetadataTypeActive,
//         getSelectedMetadataTypes,
//         getAllMetadata,
//         getAllMetadataTypes,
//         queryIfUpdateNPM,
//         onFilterChange,
//         boPath
//     };
// }

