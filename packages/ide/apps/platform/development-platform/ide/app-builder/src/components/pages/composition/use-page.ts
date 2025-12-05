import { Ref, ref } from "vue";
import { UsePage } from "./types";
import axios from "axios";

export function usePage(): UsePage {
    // const pageSourceUri = './assets/pages.json';
    const pageSourceUri = '/api/dev/main/v1.0/mdservice/ide/metadataexplore?path=/Cases/ApplicationTemplates/Contacts&metadataTypeList='
    const pages: Ref<Record<string, any>[]> = ref([]);

    function createPage() { }

    function getPages() {
        return new Promise<any[]>((resolve, reject) => {
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

    return { createPage, pages, getPages };
}
