import { inject, Ref, ref } from "vue";
import { UsePage } from "./types";
import axios from "axios";
import { UseWorkspace } from "../../../composition/types";

export function usePage(): UsePage {
    // const pageSourceUri = './assets/pages.json';
    // todo: 讲pageSourceUri的path路径改成当前应用实际路径
    const useWorkspaceComposition = inject('f-admin-workspace') as UseWorkspace;
    const pages: Ref<Record<string, any>[]> = ref([]);
    const metadataGroup: Ref<Record<string, any>[]> = ref([]);

    const frameworkData = [
        { code: 'All', name: '全部', active: false },
        { code: 'Interface', name: '界面', types: ['Form', 'MobileForm', 'HelpMetadata', 'GSPBusinessEntity'], active: true }
    ];
    const metadataTypeData = [
        { code: 'All', name: '全部', active: false },
        { code: 'GSPBusinessEntity', name: '业务实体', types: ['GSPBusinessEntity'], active: true },
        { code: 'GSPViewModel', name: '视图模型', types: ['GSPViewModel'] },
        { code: 'Form', name: '表单', types: ['Form'], active: true },
        { code: 'MobileForm', name: '移动表单', types: ['MobileForm'], active: true },
        { code: 'QueryObject', name: '查询对象', types: ['QueryObject'] },
        { code: 'HelpMetadata', name: '帮助文档', types: ['HelpMetadata'], active: true },
        { code: 'StateMachine', name: '状态机', types: ['StateMachine'] },
        {
            code: 'cmp', name: '构件', types: [
                'Component', 'WebCommand', 'BEMgrComponent', 'BEComponent',
                'DeterminationComponent', 'ValidationComponent', 'UDTValidComponent', 'UDTDtmComponent', 'VMComponent',
                'CommonComponent', 'WebComponent', 'WebServiceComponent', 'SourceCodeMetadata'
            ]
        },
        { code: 'res', name: '资源', types: ['ResourceMetadata'] },
        { code: 'api', name: 'Api', types: ['ExternalApi', 'InternalApi', 'Event', 'Action', 'PubSub'] },
        { code: 'DBO', name: '数据对象', types: ['DBO'] },
    ];

    const state = {
        types: ['Form', 'MobileForm', 'HelpMetadata', 'GSPBusinessEntity']
    };

    function createPage() { }

    function getPages() {
        return new Promise<any[]>((resolve, reject) => {
            const { options } = useWorkspaceComposition;
            const pageSourceUri = `/api/dev/main/v1.0/mdservice/ide/metadataexplore?path=${options.path}&metadataTypeList=`
            axios.get(pageSourceUri).then((response) => {
                const pageData = response.data as Record<string, any>[];
                // pages.value = pageData.filter((page) => page.type === 'Form');
                pages.value = pageData;
                resolve(pages.value);
            }, (error) => {
                resolve([]);
            });
        });
    }

    function getAllMetadata() {
        const { options } = useWorkspaceComposition;
        const metadataUri = `/api/dev/main/v1.0/mdservice/ide/metadataexplore?path=${options.path}&metadataTypeList=`;

        return new Promise<any[]>((resolve, reject) => {
            axios.get(metadataUri).then((response) => {
                const metadataData = response.data as Record<string, any>[];
                resolve(metadataData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    function getAllMetadataTypes() {
        const metadataTypesUri = `/api/dev/main/v1.0/metadata-configs`;
        return new Promise<any[]>((resolve, reject) => {
            axios.get(metadataTypesUri).then((response) => {
                const metadataTypesData = response.data as Record<string, any>[];
                resolve(metadataTypesData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    function getMetadataGroup() {
        return new Promise<any[]>((resolve, reject) => {
            getAllMetadataTypes().then((metadataTypesData) => {
                const group = metadataTypesData;
                getAllMetadata().then((metadataList) => {
                    group.forEach((group) => {
                        group.items = metadataList.filter((metadata) => metadata.type === group.typeCode);
                    });
                    metadataGroup.value = group.filter((group) => group.items.length > 0 && state.types.includes(group.typeCode));
                    resolve(group);
                });
            });
        });
    }

    return { createPage, pages, metadataGroup, getPages, getAllMetadata, getAllMetadataTypes, getMetadataGroup, frameworkData, metadataTypeData };
}
