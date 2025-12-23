import { Ref } from "vue";

export interface UsePage {

    pages: Ref<Record<string, any>[]>;

    getPages: (path: string) => Promise<Record<string, any>[]>;

}
