import type { App, Component } from 'vue';
import { createPropsResolver } from '@farris/ui-vue';
import type { NodeDefinition } from './node-definition';
import type { PropertyPanelConfig } from './property-panel';
import type { FlowMetadata, JsonNode, FlowNode, FlowEdge } from './flow-metadata';
import type { EdgeProps } from '@vue-flow/core';

export type WithInstall<T> = T & {
    install(app: App): void;
};

export function withInstall<T extends Component>(options: T) {
    (options as Record<string, unknown>).install = (app: App) => {
        const { name } = options;
        if (name) {
            app.component(name, options);
        }
    };
    return options as WithInstall<T>;
}

export type WithComponentRegister<T> = T & {
    register(
        componentMap: Record<string, any>,
        componentPropsConverter: Record<string, any>,
        componentPropertyConfigConverter: Record<string, any>,
        resolverMap: Record<string, any>,
    ): void;
};

type PropsResolverType = ReturnType<typeof createPropsResolver>;

export function withRegister<T extends Component>(
    component: T,
    options: { name: string, propsResolver: PropsResolverType },
) {
    const { name, propsResolver } = options;

    (component as any).register = (
        componentMap: Record<string, any>,
        componentPropsConverter: Record<string, any>,
        _componentPropertyConfigConverter: Record<string, any>,
        _resolverMap: Record<string, any>,
    ) => {
        componentMap[name] = component;
        componentPropsConverter[name] = propsResolver;
    };
    return component as WithComponentRegister<T>;
}

export interface FlowInitialData {
    /** 节点列表 */
    nodes?: FlowNode[];
    /** 边列表 */
    edges?: FlowEdge[];
    /** 流程扩展信息 */
    extension?: JsonNode;
}

/**
 * 节点分组
 * @description `添加节点`面板中节点的分组信息
 */
export interface NodeCategory {
    /** 分组ID */
    id?: string;
    /** 分组的显示名称 */
    label: string;
    /** 所属于本分组的所有节点类型 */
    nodeTypes: string[];
}

export interface FlowRegistry {
    /**
     * 流程分类的名称
     * @description 流程显示的名称，例如`智能工作流`（仅开发调试时有效，生产环境下将从数据库中读取配置信息）
     */
    name?: string;
    /**
     * 流程分类的描述
     * @description 可能被用于展示（仅开发调试时有效，生产环境下将从数据库中读取配置信息）
     */
    description?: string;
    /** 流程的自定义节点实现 */
    nodes: NodeDefinition[];
    /** 需要注册的自定义属性编辑器 */
    componentRegistries?: WithComponentRegister<any>[];
    /** 自定义连接线，连接线类型到对应的渲染组件 */
    edges?: Record<string, Component<EdgeProps>>;
    /** 获取流程的属性面板配置 */
    getPropertyPanelConfig?: (flowExtensionData: JsonNode) => PropertyPanelConfig;
    /**
     * 初始化流程数据
     * @description
     * 在创建流程后将调用本方法，为流程提供初始数据，避免在初次打开流程时画布内一片空白。
     * 如果为空，则试图默认创建一个开始节点和一个结束节点。
     */
    initialData?: () => FlowInitialData;
    /**
     * 节点分组列表
     * @description 用于自定义`添加节点`面板中展示哪些节点（仅开发调试时有效，生产环境下将从数据库中读取配置信息）
     */
    nodeCategories?: NodeCategory[];
    /**
     * 设计器打开时回调
     * @description 每次打开设计器时都会调用本方法，设计器会等待本方法执行完毕后再显示画布，你可以通过本方法提前加载一些必要的数据
     */
    onDesignerOpen?: (flowMetadata: FlowMetadata) => Promise<void>;
}
