/**
 * 自定义组件登记项
 */
export interface CustomComponentConfig {
    /** 唯一标识 */
    id: string;
    /** 工具箱中显示的名称 */
    name: string;
    /** 控件类型，同时作为属性可见性黑名单的 key */
    type: string;
    /** 组件包导出的模块名 */
    module: string;
    /** 组件包地址 */
    url: string;
    /** 是否启用 */
    enabled: boolean;
}

/**
 * 设计器配置（designer-config.json）
 */
export interface DesignerConfig {
    /** 属性黑名单：控件类型 -> 需要隐藏的属性路径 */
    hiddenProperties: Record<string, string[]>;
    /** 自定义组件登记 */
    customComponents: CustomComponentConfig[];
}

/** 属性简化项 */
export interface PropertyMetaProperty {
    id: string;
    title: string;
    path: string;
}

/** 属性分类 */
export interface PropertyMetaCategory {
    id: string;
    name: string;
    properties: PropertyMetaProperty[];
}

/** 单个控件的属性简化树 */
export interface PropertyMetaControl {
    type: string;
    name: string;
    categories: PropertyMetaCategory[];
}

/** 设计器回传的属性元数据消息 */
export interface PropertyMetaMessage {
    controls: PropertyMetaControl[];
    error?: string;
}

/** 空配置 */
export function createEmptyConfig(): DesignerConfig {
    return { hiddenProperties: {}, customComponents: [] };
}
