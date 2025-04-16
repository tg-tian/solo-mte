import { Ref } from "vue";

export interface UseDomain {

    createDomain: () => void;

    domains: Ref<Record<string, any>[]>;

    getDomains: () => Promise<Record<string, any>[]>;
}
