import { Ref } from "vue";

export interface UseScenario {

    createScenario: () => void;

    scenarios: Ref<Record<string, any>[]>;

    getScenarios: () => Promise<Record<string, any>[]>;
}
