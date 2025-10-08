import { Ref, ref } from "vue";
import { UsePage } from "./types";
import axios from "axios";

export function usePage(): UsePage {
    const pageSourceUri = './assets/pages.json';
    const pages: Ref<Record<string, any>[]> = ref([]);

    function createPage() { }

    function getPages() {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(pageSourceUri).then((response) => {
                const pageData = response.data;
                pages.value = pageData;
                resolve(pageData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { createPage, pages, getPages };
}
