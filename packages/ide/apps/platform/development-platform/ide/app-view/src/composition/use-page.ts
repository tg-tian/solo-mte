import { inject, Ref, ref } from "vue";
import { UsePage } from "./types";
import axios from "axios";

export function usePage(): UsePage {
    // const pageSourceUri = './assets/pages.json';
    // todo: 讲pageSourceUri的path路径改成当前应用实际路径
    const pages: Ref<Record<string, any>[]> = ref([]);
    const metadataGroup: Ref<Record<string, any>[]> = ref([]);

    function getPages(path: string) {
        return new Promise<any[]>((resolve, reject) => {
            const pageSourceUri = `/api/dev/main/v1.0/mdservice/ide/metadataexplore?path=${path}&metadataTypeList=`
            axios.get(pageSourceUri).then((response) => {
                const pageData = response.data as Record<string, any>[];
                pages.value = pageData.filter((page) => page.type === 'Form');
                // pages.value = pageData;
                resolve(pages.value);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { pages, getPages, };
}
