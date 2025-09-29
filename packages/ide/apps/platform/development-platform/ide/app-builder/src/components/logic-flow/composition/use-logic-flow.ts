import { Ref, ref } from "vue";
import { UseLogicFlow } from "./types";
import axios from "axios";

export function useLogicFlow(): UseLogicFlow {
    const logicSourceUri = './assets/logic-flows.json';
    const logicFlows: Ref<Record<string, any>[]> = ref([]);

    function createLogicFlow() { }

    function getLogicFlows() {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(logicSourceUri).then((response) => {
                const logicData = response.data;
                logicFlows.value = logicData;
                resolve(logicData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { createLogicFlow, logicFlows, getLogicFlows };
}
