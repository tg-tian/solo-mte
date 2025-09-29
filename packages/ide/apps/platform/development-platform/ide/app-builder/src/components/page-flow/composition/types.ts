import { Ref } from "vue";

export interface UsePageFlow {

    createPageFlow: () => void;

    pageFlows: Ref<Record<string, any>[]>;

    getPageFlows: () => Promise<Record<string, any>[]>;
}
