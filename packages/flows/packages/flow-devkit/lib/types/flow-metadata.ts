import type { SizeSchema } from './node-definition';
import type { TypeRefer } from './type';
import type { JsonSchema } from './json-schema';
import type { InputHelp } from './input-help';
import type { EdgeComponent, Styles } from '@vue-flow/core';

/** 流程元数据 */
export interface FlowMetadata {
    /** 内码 */
    id: string;
    /** 类型 */
    kind: string;
    /** 编号 */
    code: string;
    /** 名称 */
    name: string;
    /** 描述 */
    description: string;
    /** 版本 */
    version: string;
    /** 父流程ID */
    parentId?: string;
    /** 节点列表 */
    nodes: FlowNode[];
    /** 连线列表 */
    edges: FlowEdge[];
    /** 扩展信息 */
    extension: JsonNode;

    /** 业务类型ID */
    bizTypeId?: string;
    /** 创建者ID */
    createdBy?: string;
    /** 创建时间 */
    createdOn?: string;
    /** 最后修改人 */
    lastChangedBy?: string;
    /** 最后修改时间 */
    lastChangedOn?: string;
}

/** 节点 */
export interface FlowNode {
    /**
     * 内码
     * @description 唯一，用户不可编辑
     */
    id: string;
    /** 类型 */
    kind: string;
    /**
     * 编号
     * @description 唯一，用户不可编辑
     */
    code: string;
    /** 名称 */
    name: string;
    /** 描述 */
    description: string;
    /** 输入参数列表 */
    inputParams: Parameter[];
    /** 输出参数列表 */
    outputParams: Parameter[];
    /** 输入端口列表 */
    inputPorts: string[];
    /** 输出端口列表 */
    outputPorts: string[];
    /** 节点的画布信息 */
    graphMeta: NodeGraphMeta;
    /** 子节点列表 */
    nodes?: FlowNode[];
    /** 子节点之间的连接线列表 */
    edges?: FlowEdge[];
    /** 其它自定义属性 */
    [key: string]: any;
}

/** 连接线 */
export interface FlowEdge {
    /** 源节点ID */
    sourceNodeId: string;
    /** 目标节点ID */
    targetNodeId: string;
    /** 源端口 */
    sourcePort: string;
    /** 目标端口 */
    targetPort: string;
    /** 连接线的画布信息 */
    graphMeta?: EdgeGraphMeta;
}

/**
 * 参数
 * @description 流程节点的输入输出参数
 */
export interface Parameter {
    /**
     * 唯一标识
     * @description 后端不存储`id`字段，仅前端内部使用，创建参数时必须设置`id`属性
     */
    id?: string;
    /**
     * 参数编号
     * @description 作为参数名，允许用户进行编辑
     */
    code: string;
    /**
     * 显示名称
     * @description 在`试运行`面板中，如果`显示名称`非空则显示`显示名称`，否则显示`参数编号`
     */
    name?: string;
    /** 参数描述 */
    description?: string;
    /** 参数类型 */
    type: TypeRefer;
    /** 参数值 */
    valueExpr?: ValueExpress;
    /** @deprecated 本字段无效，请使用`valueExpr`字段 */
    value?: any;
    /** 是否必填 */
    required?: boolean;
    /**
     * 是否可写入
     * @description 默认可写入，后端暂不存储`writable`字段，仅前端内部使用
     */
    writable?: boolean;
    /**
     * 是否可编辑
     * @description 默认可编辑，控制参数的删除和修改权限，仅前端内部使用
     */
    readOnly?: boolean;
    /**
     * 参数schema
     * @description 当`type`为`Object`或`Array<Object>`时，通过本字段描述`Object`的结构
     */
    schema?: JsonSchema;

    /** 输入帮助设置 */
    inputHelp?: InputHelp;
}

export type JsonNode = Record<string, any>;

/**
 * 值表达式
 * @description
 * 可以表示一个常量值，或者一个对节点变量的引用，或者一个高级表达式，或者其它
 */
export interface ValueExpress {
    /**
     * 表达式类型
     * @description 根据表达式类型的不同，所需的其它字段也不同
     */
    kind: string;

    [key: string]: any;
}

/**
 * 值表达式的类型
 * @description 根据值表达式`ValueExpress`推断得到的类型信息
 */
export interface ValueExpressType {
    type: TypeRefer;
    schema?: JsonSchema;
}

/** 节点的画布信息 */
export interface NodeGraphMeta {
    /** 节点在画布上的坐标或者子节点相对于父节点的坐标 */
    position: {
        x: number;
        y: number;
        [key: string]: any;
    },
    /** 子画布大小 */
    subFlowCanvasSize?: SizeSchema;
    /** 是否可删除，默认允许 */
    deletable?: boolean;
    /** 是否可选中，默认允许 */
    selectable?: boolean;
    /** 是否可拖拽，默认允许 */
    draggable?: boolean;

    /** 其它字段 */
    [key: string]: any;
}

/** 连接线的画布信息 */
export interface EdgeGraphMeta {
    /** 连接线类型 */
    type?: string;
    /** 额外传递给连接线的数据 */
    data?: Record<string, any>;
    /** 是否可删除，默认允许 */
    deletable?: boolean;
    /** 是否可选中，默认允许 */
    selectable?: boolean;
    /** 是否动画 */
    animated?: boolean;
    /** 自定义样式 */
    style?: Styles;
    /** 渲染连接线的组件 */
    template?: EdgeComponent;

    /** 其它字段 */
    [key: string]: any;
}
