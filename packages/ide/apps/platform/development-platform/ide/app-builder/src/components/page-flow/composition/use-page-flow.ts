import { Ref, ref } from "vue";
import { UsePageFlow } from "./types";
import axios from "axios";

export function usePageFlow(): UsePageFlow {
    const pageSourceUri = './assets/page-flows.json';
    const pageFlows: Ref<Record<string, any>[]> = ref([]);

    function createPageFlow() { }

    function getPageFlows() {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(pageSourceUri).then((response) => {
                const pageData = response.data;
                pageFlows.value = pageData;
                resolve(pageData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { createPageFlow, pageFlows, getPageFlows };
}
