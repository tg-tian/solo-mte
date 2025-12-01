import { Ref, ref } from "vue";
import { UsePageFlow } from "./types";
import axios from "axios";

export function usePageFlow(): UsePageFlow {
    // const pageSourceUri = './assets/page-flows.json';
    const pageFlowSourceUri = '/api/dev/main/v1.0/mdservice/ide/metadataexplore?path=/Cases/ApplicationTemplates/Contacts&metadataTypeList='
    const pageFlows: Ref<Record<string, any>[]> = ref([]);

    function createPageFlow() { }

    function getPageFlows() {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(pageFlowSourceUri).then((response) => {
                const pageData = response.data as Record<string, any>[];
                pageFlows.value = pageData.filter((page) => page.type === 'PageFlowMetadata');
                resolve(pageFlows.value);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { createPageFlow, pageFlows, getPageFlows };
}
