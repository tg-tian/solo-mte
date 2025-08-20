import { ref } from "vue";
import { WorkAreaInstance, UseWorkAreaInstance } from "./types";
import axios from "axios";

export function useWorkAreaInstance(): UseWorkAreaInstance {
    const activeInstanceId = ref('');
    const workAreaInstances = ref<WorkAreaInstance[]>([]);
    const workAreaInstanceMap = new Map<string, any>();

    /**
     * 用于在加载完全局配置文件后，设置初始化状态下默认打开的功能菜单
     * @param residentInstances 预制菜单实例数据
     */
    function setResidentInstance(residentInstances: WorkAreaInstance[]) {
        if (residentInstances.length) {
            workAreaInstances.value = [...residentInstances];
            activeInstanceId.value = residentInstances[0].id;
            workAreaInstanceMap.clear();
            residentInstances.reduce((emptyWorkAreaMap: Map<string, any>, workAreaInstance: WorkAreaInstance) => {
                emptyWorkAreaMap.set(workAreaInstance.id, ref());
                return emptyWorkAreaMap;
            }, workAreaInstanceMap);
        }
    }

    function loadWorkAreaConfiguration(workAreaSourceUri: string) {
        return new Promise<any[]>((resolve, reject) => {
            axios.get(workAreaSourceUri).then((response) => {
                setResidentInstance(response.data);
                resolve(workAreaInstances.value);
            }, (error) => {
                resolve([]);
            });
        });
    }

    /**
     * 更加功能菜单标识激活已经打开的功能菜单实例
     * @param workAreaId 功能菜单标识
     */
    function activeWorkAreaInstance(workAreaId: string) {
        const openedWorkAreaInstance = workAreaInstances.value.find((instance: WorkAreaInstance) => instance.id === workAreaId);
        if (openedWorkAreaInstance) {
            activeInstanceId.value = openedWorkAreaInstance.id;
        }
    }

    return { activeInstanceId, activeWorkAreaInstance, loadWorkAreaConfiguration, workAreaInstances, workAreaInstanceMap, setResidentInstance };
}
