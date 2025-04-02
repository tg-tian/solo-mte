import { ref } from "vue";
import { FunctionInstance, FunctionItem, UseConfig, UseFunctionInstance } from "./types";
import { useResolveFunctionUrl } from "./use-resolve-function-url";

export function useFunctionInstance(config: UseConfig): UseFunctionInstance {
    const activeInstanceId = ref('');
    const functionInstances = ref<FunctionInstance[]>([]);
    const functionInstanceMap = new Map<string, FunctionInstance>();
    const useResolveFunctionUrlComposition = useResolveFunctionUrl(config);

    /**
     * 用于在加载完全局配置文件后，设置初始化状态下默认打开的功能菜单
     * @param residentInstances 预制菜单实例数据
     */
    function setResidentInstance(residentInstances: FunctionInstance[]) {
        if (residentInstances.length) {
            functionInstances.value = [...residentInstances];
            activeInstanceId.value = residentInstances[0].functionId;
        }
    }

    /**
     * 激活菜单页签集合中的下一个功能菜单页签
     * @param indexToActivate 待激活功能索引
     */
    function activateNextFunctionInstance(indexToActivate: number) {
        const nextActiveFunctionIndex = indexToActivate > functionInstances.value.length - 1 ?
            functionInstances.value.length - 1 : indexToActivate;
        const nextActiveFunctionInstance = functionInstances.value[nextActiveFunctionIndex] as FunctionInstance;
        activeInstanceId.value = nextActiveFunctionInstance.instanceId;
    }

    /**
     * 销毁待关闭的功能菜单实例
     */
    function disposeClosingFunctionInstance(closingFunctionInstance: FunctionInstance): number {
        const indexOfClosingFunctionInstance = functionInstances.value
            .findIndex((instance: FunctionInstance) => instance.instanceId === closingFunctionInstance.instanceId);
        functionInstances.value.splice(indexOfClosingFunctionInstance, 1);
        functionInstanceMap.delete(closingFunctionInstance.functionId);
        return indexOfClosingFunctionInstance;
    }

    /**
     * 根据功能菜单实例标识查找功能菜单实例
     * @param instanceId 功能菜单实例标识
     * @returns 功能菜单实例对象
     */
    function findTheFunctionInstanceOf(instanceId: string): FunctionInstance | undefined {
        const matchedFunctionInstance = functionInstances.value
            .find((functionInstance: FunctionInstance) => functionInstance.instanceId === instanceId);
        return matchedFunctionInstance;
    }

    /**
     * 更加功能菜单标识激活已经打开的功能菜单实例
     * @param functionId 功能菜单标识
     */
    function activeFunctionInstance(functionId: string) {
        const openedFunctionInstance = functionInstanceMap.get(functionId) as FunctionInstance;
        activeInstanceId.value = openedFunctionInstance.instanceId;
    }

    /**
     * 
     * @param functionId 功能菜单标识
     * @param code 功能菜单编号
     * @param name 在已打开功能菜单页签集合中显示的文本
     * @param icon 图标
     * @param fix 固定在左侧
     */
    function openNewFunction(functionId: string, code: string, name: string, icon = '', fix = false) {
        const instanceId = `${functionId}${Date.now()}`;
        useResolveFunctionUrlComposition.resolve(functionId).then((url: string) => {
            const newFunctionInstance = { functionId, instanceId, code, name, url, icon, fix };
            functionInstances.value.push(newFunctionInstance);
            functionInstanceMap.set(functionId, newFunctionInstance);
            activeInstanceId.value = instanceId;
        });
    }

    /**
     * 根据功能菜单对象打开对应的功能菜单
     * @param functionItem 功能菜单对象
     */
    function open(functionItem: FunctionItem) {
        const { id: functionId, code, name } = functionItem;
        const hasOpenedTheFunction = functionInstanceMap.has(functionId);
        if (hasOpenedTheFunction) {
            activeFunctionInstance(functionId);
        } else {
            openNewFunction(functionId, code, name);
        }
    }

    /**
     * 关闭指定标识的功能菜单实例
     * @param functionInstanceId 已经打开的功能菜单实例标识
     */
    function close(functionInstanceId: string) {
        const closingFunctionInstance = findTheFunctionInstanceOf(functionInstanceId);
        if (closingFunctionInstance !== undefined) {
            const indexOfClosingFunctionInstance = disposeClosingFunctionInstance(closingFunctionInstance);
            activateNextFunctionInstance(indexOfClosingFunctionInstance);
        }
    }

    return { activeInstanceId, close, functionInstances, open, setResidentInstance };
}
