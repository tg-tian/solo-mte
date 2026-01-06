import { Ref, ref } from "vue";
import { UseScenario } from "./types";
import axios from "axios";

export function useScenario(): UseScenario {
    //TODO: 暂时写死领域为26，后续需要修改scene接口(mte-prototype项目: SceneController: getSceneList)，使之允许不传domainId
    const scenarioSourceUri = 'http://139.196.147.52:8080/scenes?domainId=26';
    const scenarios: Ref<Record<string, any>[]> = ref([]);



    function createScenario() { }

    function getScenarios() {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(scenarioSourceUri).then((response) => {
                const scenarioData = response.data;
                scenarios.value = scenarioData;
                resolve(scenarioData);
            }, (error) => {
                resolve([]);
            });
        });
    }

    return { createScenario, scenarios, getScenarios };
}
