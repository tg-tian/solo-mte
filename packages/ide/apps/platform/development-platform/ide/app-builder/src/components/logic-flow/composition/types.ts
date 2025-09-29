import { Ref } from "vue";

export interface UseLogicFlow {

    createLogicFlow: () => void;

    logicFlows: Ref<Record<string, any>[]>;

    getLogicFlows: () => Promise<Record<string, any>[]>;
}
