import { Ref } from "vue";

export interface UsePage {

    createPage: () => void;

    pages: Ref<Record<string, any>[]>;

    getPages: () => Promise<Record<string, any>[]>;
}
