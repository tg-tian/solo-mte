import type { Ref } from 'vue';
import type { FlowMetadata, FlowRegistry, FlowInitialData } from '@farris/flow-devkit';
import type { NodePanelCategory } from '@flow-designer/types';

export interface UseFlowMetadata {
    /** 流程元数据 */
    metadata: FlowMetadata;
    /** 流程类型 */
    flowType: Ref<string>;
    /** 流程自定义内容 */
    flowRegistry: Ref<FlowRegistry | undefined>;
    /** 流程元数据与流程扩展内容是否加载完毕 */
    isLoaded: Ref<boolean>;
    /** 是否可以显示 */
    isReady: Ref<boolean>;
    /**
     * 保存流程元数据
     * @description 将当前的流程数据转化为流程元数据并保存
     * @param silent 是否静默处理，如果静默则成功或失败不会弹出提示消息
     * @returns 是否成功
     */
    saveFlowMetadata: (silent?: boolean) => Promise<boolean>;
}

export interface UseFlowKind {
    /** 流程扩展内容 */
    flowRegistry: Ref<FlowRegistry | undefined>;

    /**
     * 加载流程内容
     * @param flowType     流程类型
     * @param flowMetadata 编排元数据
     * @returns 是否加载成功
     */
    initFlowContent: (flowType: string, flowMetadata: FlowMetadata) => Promise<boolean>;

    /** 获取当前流程节点的分组 */
    getNodeCategories: () => Ref<NodePanelCategory[]>;

    /** 获取全部节点的分组 */
    getAllNodeCategories: () => Ref<NodePanelCategory[]>;

    /**
     * 根据节点类型加载节点所属的扩展脚本
     * @description 加载时会在画布上显示遮罩，加载失败会弹出提示信息
     * @param nodeType 节点类型
     * @returns 是否加载成功
     */
    loadNodeByType: (nodeType: string) => Promise<boolean>;

    /** 默认的流程数据初始化回调方法 */
    initializeFlowDataByDefault: () => FlowInitialData;
}
