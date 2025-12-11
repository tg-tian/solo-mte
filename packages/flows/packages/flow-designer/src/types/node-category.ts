import type { FlowNodeInfo } from './flow-kind';

/**
 * `添加节点`面板的节点条目
 */
export interface NodePanelItem {
    /** 节点类型 */
    type: string;
    /** 节点的显示名称 */
    label: string;
    /** 节点图标 */
    icon?: string;
    /** 节点描述 */
    description?: string;
    /** 节点的注册信息 */
    raw?: FlowNodeInfo;
}

/**
 * `添加节点`面板的节点分组
 */
export interface NodePanelCategory {
    /** 分组ID */
    id: string;
    /** 分组的显示名称 */
    label: string;
    /** 分组下的所有节点 */
    nodes: NodePanelItem[];
}
