import type { Component } from 'vue';
import type { GraphEdge } from '@vue-flow/core';
import type { PropertyPanelConfig } from './property-panel';
import type { Parameter } from './flow-metadata';

export type Position = 'left' | 'right' | 'top' | 'bottom';
export type NodePortType = 'target' | 'source';
export type PortConnectable = boolean | number | 'single';

export interface Connection {
  /** 源节点ID */
  sourceNodeId: string;
  /** 目标节点ID */
  targetNodeId: string;
  /** 源端口 */
  sourcePort?: string;
  /** 目标端口 */
  targetPort?: string;
}

export type ValidConnectionFunc = (
  connection: Connection,
  elements: {
    edges: GraphEdge[];
    nodes: FlowNodeInstance[];
    sourceNode: FlowNodeInstance;
    targetNode: FlowNodeInstance;
    sourcePortConfig?: NodePortConfig;
    targetPortConfig?: NodePortConfig;
  },
) => boolean;

/**
 * 节点连接点定义
 */
export interface NodePortConfig {
  /** 连接点唯一标识（如 "in-1"、"out-2"） */
  id: string;
  /** 连接点位置，top/bottom/left/right */
  position: Position;
  /** 连接点类型，输入/输出 */
  type: NodePortType;
  /** 连接点显示标签 */
  label?: string;
  /** 连接点样式（如颜色、大小） */
  style?: Partial<CSSStyleDeclaration>;
  /** 允许连接的节点类型，为空则不限制 */
  allowedNodeTypes?: string[];
  /** 不允许连接的节点类型，为空则不限制 */
  notAllowedNodeTypes?: string[];
  /**
   * 连接点是否可连接
   * @description 如果不满足条件则无法从连接点拖拽出连接线
   */
  connectable?: PortConnectable;
  /**
   * 判断连接线是否合法
   * @description 如果不满足条件则松手后连接线消失
   */
  isValidConnection?: ValidConnectionFunc;
  /**
   * 是否在连接点组件卸载时自动移除相关的连接线
   * @description 默认不启用，如果节点根据节点数据的变化动态渲染连接点，可以考虑启用本属性。
   * 你也可以通过手动调用`UseFlow.removeAttachedEdgesByPortId`方法实现对连接点上所有连接线的移除。
   */
  removeAttachedEdgesOnUnmounted?: boolean;
  /** 连接点排序顺序 */
  sortIndex?: number;
}

export interface PaddingSchema {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface SizeSchema {
  width: number;
  height: number;
}

/**
 * 节点配置信息
 */
export interface NodeMetadata {
  /**
   * 节点类型标识
   * @description 唯一，可带流程前缀，如`workflow:approval`
   */
  type: string;

  /**
   * 节点显示名称
   * @description 用于节点面板、节点标题
   */
  label: string;

  /** 节点描述 */
  description?: string;

  /** 是否开始节点 */
  isStartNode?: boolean;

  /** 是否结束节点 */
  isEndNode?: boolean;

  /** 节点图标 */
  icon?: string;

  /** 是否包含子流程 */
  isSubFlowContainer?: boolean;

  /** 子流程画布中子节点距离画布边缘的最小距离 */
  subFlowCanvasPadding?: PaddingSchema;

  /** 子流程画布的默认大小 */
  subFlowCanvasSize?: SizeSchema;

  /**
   * 是否允许单节点调试
   * @description 除了开始节点和结束节点，其它节点均默认可调试
   */
  debuggable?: boolean;

  /** 是否可复制，默认允许 */
  canCopy?: boolean;

  /** 是否允许重命名，默认允许 */
  canRename?: boolean;

  /** 是否可删除，默认允许 */
  deletable?: boolean;

  /** 是否可选中 */
  selectable?: boolean;

  /** 是否可拖拽 */
  draggable?: boolean;

  /** 是否可连接 */
  connectable?: boolean;

  /** 节点宽度 */
  width?: number;

  /** 节点高度 */
  height?: number;

  /** 连接点配置 */
  ports: NodePortConfig[];
}

/**
 * 节点数据
 */
export interface NodeData {
  /**
   * 节点内码
   * @description 只读，不可编辑
   */
  readonly id: string;
  /**
   * 节点类型
   * @description 只读，不可编辑
   */
  readonly kind: string;
  /**
   * 节点编号
   * @description 只读，不可编辑
   */
  readonly code: string;
  /** 节点名称 */
  name: string;
  /** 节点描述 */
  description: string;
  /** 输入参数列表 */
  inputParams: Parameter[];
  /** 输出参数列表 */
  outputParams: Parameter[];
  /** 输入端口列表 */
  inputPorts: string[];
  /** 输出端口列表 */
  outputPorts: string[];
  /**
   * 子画布大小
   * @description 只读，不可编辑
   */
  subFlowCanvasSize?: SizeSchema;
  /** 其它自定义属性 */
  [key: string]: any;
};

export interface XYPosition {
  x: number;
  y: number;
}

/**
 * 节点组件的Props
 */
export interface NodeProps {
  /** 节点ID */
  id: string;
  /** 节点类型 */
  type: string;
  /** 是否被选中 */
  selected: boolean;
  /** 节点数据 */
  data: NodeData;
  /** 节点元数据 */
  metadata: NodeMetadata;
  /** 位置 */
  position: XYPosition;
  /** 父节点ID */
  parentNodeId?: string;
  /** 是否正在拖拽 */
  dragging: boolean;
  /** 是否正在改变大小 */
  resizing: boolean;
  /** z-index */
  zIndex: number;
  /** 更新节点数据的回调 */
  onUpdateData?: (data: Partial<NodeData>) => void;
}

/**
 * 节点
 */
export interface FlowNodeInstance {
  /** 节点ID */
  id: string;
  /** 节点类型 */
  type: string;
  /** 是否被选中 */
  selected: boolean;
  /** 节点数据 */
  data: NodeData;
  /** 节点元数据 */
  metadata: NodeMetadata;
  /** 位置 */
  position: XYPosition;
  /** 父节点ID */
  parentNodeId?: string;
  /** 是否正在拖拽 */
  dragging: boolean;
  /** 是否正在改变大小 */
  resizing: boolean;
  /** z-index */
  zIndex?: number;
  /** 其它字段 */
  [key: string]: any;
}

/** 节点校验结果 */
export type NodeValidationResult = NodeValidationDetails | undefined;

/** 节点校验详情 */
export interface NodeValidationDetails {
  isValid?: boolean;
  errors?: {
    message: string;
    fieldName?: string;
  }[];
}

type GetOutputParams = (nodeData: NodeData) => Parameter[];

/**
 * 完整节点定义
 */
export interface NodeDefinition {
  /** 节点元数据 */
  metadata: NodeMetadata;

  /** 节点渲染组件 */
  component: Component<NodeProps>;

  /** 校验节点数据 */
  validator?: (data: NodeData) => NodeValidationResult;

  /**
   * 初始化节点数据
   * @description 在新建节点时将调用本方法初始化节点数据
   */
  initialData?: () => Partial<NodeData>;

  /** 获取节点属性面板配置 */
  getPropertyPanelConfig?: (nodeData: NodeData, node: FlowNodeInstance) => PropertyPanelConfig;

  /** 属性面板默认宽度，单位`px`，优先级高于`FlowRegistry.nodePropertyPanelDefaultWidth` */
  propertyPanelDefaultWidth?: number;

  /**
   * 获取供后续节点引用的参数列表
   * @description 开始节点默认使用`inputParams`属性，其它节点默认使用`outputParams`属性
   */
  getOutputParams?: GetOutputParams;

  /**
   * 获取供后代节点引用的参数列表
   * @description 默认使用`getOutputParams`方法
   */
  getOutputParamsForChildNodes?: GetOutputParams;

  /**
   * 获取调试时需要的参数列表
   * @description 用于单节点调试时提取需要用户输入的参数
   */
  getDebugParams?: (nodeData: NodeData) => Parameter[];

  /**
   * 连接或断开连接后的回调方法
   * @description 在新增或者移除与本节点有关的连接线之后回调
   * @param nodeData       节点数据
   * @param connectedNodes 所有与本节点相连接的节点
   * @param incomingNodes  指向当前节点的上游节点
   * @param outgoingNodes  当前节点指向的下游节点
   * @param connectedEdges 所有与本节点相关的连接线
   */
  afterEdgeAddOrRemove?: (
    nodeData: NodeData,
    connectedNodes: FlowNodeInstance[],
    incomingNodes: FlowNodeInstance[],
    outgoingNodes: FlowNodeInstance[],
    connectedEdges: GraphEdge[],
  ) => void;

  /** 获取节点图标地址 */
  getNodeIconUrl?: (nodeData: NodeData) => string;
}
