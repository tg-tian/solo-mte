import { ref } from 'vue';
import { FunctionInstance, FunctionItem, UseConfig, UseFunctionInstance } from './types';
import { useResolveFunctionUrl } from './use-resolve-function-url';

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
            activeInstanceId.value = residentInstances[0].instanceId;
        }
    }

    /**
     * 激活菜单页签集合中的下一个功能菜单页签
     * @param indexToActivate 待激活功能索引
     */
    function activateNextFunctionInstance(indexToActivate: number) {
        if (functionInstances.value.length === 0) {
            activeInstanceId.value = '';
            return;
        }
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
     * 根据功能菜单标识激活已经打开的功能菜单实例
     * @param functionId 功能菜单标识
     */
    function activeFunctionInstance(functionId: string) {
        const openedFunctionInstance = functionInstanceMap.get(functionId) as FunctionInstance;
        activeInstanceId.value = openedFunctionInstance.instanceId;
    }

    function openNewFunctionUrl(functionId: string, code: string, name: string, url: string, icon = '', fix = false) {
        const instanceId = `${functionId}${Date.now()}`;
        const newFunctionInstance = { type: 'function', functionId, instanceId, code, name, url, icon, fix };
        functionInstances.value.push(newFunctionInstance);
        functionInstanceMap.set(functionId, newFunctionInstance);
        activeInstanceId.value = instanceId;
    }

    /**
     *
     * @param functionItem 功能菜单对象
     * @param icon 图标
     * @param fix 固定在左侧
     */
    function openNewFunction(functionItem: FunctionItem, icon = '', fix = false) {
        useResolveFunctionUrlComposition.resolve(functionItem).then((url: string) => {
            const { id: functionId, code, name } = functionItem;
            openNewFunctionUrl(functionId, code, name, url, icon, fix);
        });
    }

    function createConversation(
        title: string,
        pendingMessages: any[],
        displayedMessages: any[] = []
    ): any {
        return {
            id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title,
            messages: [...displayedMessages],
            pendingMessages: [...pendingMessages],
        };
    }

    async function loadConversationFromJson(url: string): Promise<any> {
        if (!url || !url.trim()) {
            throw new Error(`加载对话数据失败: 对话地址为空`);
        }
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`加载对话数据失败: ${url} (${res.status})`);
        }
        const data = await res.json();
        const title = String(data.title ?? '');
        const pendingMessages = Array.isArray(data.pendingMessages) ? data.pendingMessages as any[] : [];
        const displayedMessages = Array.isArray(data.displayedMessages) ? data.displayedMessages as any[] : [];
        return createConversation(title, pendingMessages, displayedMessages);
    }

    function addConversationTab(conv: any) {
        const instanceId = `${conv.id}-${Date.now()}`;
        const newFunctionInstance: FunctionInstance = {
            type: 'conversation',
            instanceId,
            functionId: conv.id,
            code: '',
            name: conv.title,
            url: '',
        };
        functionInstances.value.push(newFunctionInstance);
        functionInstanceMap.set(conv.id, newFunctionInstance);
        activeInstanceId.value = instanceId;
    }

    function setInitialConversationState(conv: any) {
        const instanceId = `${conv.id}-${Date.now()}`;
        const newFunctionInstance: FunctionInstance = {
            type: 'conversation',
            instanceId,
            functionId: conv.id,
            code: '',
            name: conv.title,
            url: '',
        };
        functionInstances.value = [newFunctionInstance];    
        functionInstanceMap.clear();
        functionInstanceMap.set(conv.id, newFunctionInstance);
        activeInstanceId.value = instanceId;
    }

    function activateConversationTabByConvId(convId: string) {
        const fi = functionInstanceMap.get(convId);
        if (fi) {
            activeInstanceId.value = fi.instanceId;
        }
    }

    async function openNewConversation(conversionUri: string) {
        const conv = await loadConversationFromJson(conversionUri);
        addConversationTab(conv);
    }

    /**
     * 根据功能菜单对象打开对应的功能菜单
     * @param functionItem 功能菜单对象
     */
    function open(functionItem: FunctionItem) {
        const { id: functionId } = functionItem;
        const hasOpenedTheFunction = functionInstanceMap.has(functionId);
        if (hasOpenedTheFunction) {
            activeFunctionInstance(functionId);
        } else {
            openNewFunction(functionItem);
        }
    }

    function openUrl(functionId: string, code: string, name: string, functionUrl: string) {
        const hasOpenedTheFunction = functionInstanceMap.has(functionUrl);
        if (hasOpenedTheFunction) {
            activeFunctionInstance(functionUrl);
        } else {
            openNewFunctionUrl(functionId, code, name, functionUrl);
        }
    }

    /**
     * 关闭指定标识的功能菜单实例
     * @param functionInstanceId 已经打开的功能菜单实例标识
     */
    function close(functionInstanceId: string) {
        const closingFunctionInstance = findTheFunctionInstanceOf(functionInstanceId);
        if (closingFunctionInstance !== undefined) {
            if (closingFunctionInstance.type === 'conversation') {
            }
            const indexOfClosingFunctionInstance = disposeClosingFunctionInstance(closingFunctionInstance);
            activateNextFunctionInstance(indexOfClosingFunctionInstance);
        }
    }

    return {
        activeInstanceId,
        close,
        functionInstances,
        open,
        openUrl,
        setResidentInstance,
        loadConversationFromJson,
        openNewConversation,
        createConversation,
        setInitialConversationState,
        addConversationTab,
        activateConversationTabByConvId,
    };
}
